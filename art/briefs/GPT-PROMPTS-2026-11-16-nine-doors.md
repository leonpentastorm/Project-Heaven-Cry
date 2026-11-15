# GPT prompts, 16 Nov 2026: every image the nine doors still need (release 0.29)

For the artist, and for GPT. Leon, 16 Nov 2026: *"Then i want a file with all art needed for this new revamp. put place holder on
everything, do not affraid to invent new are because after this i will get GTP woking and fix that for us."*

This file is the inventory of release 0.29 (`wip/feature-0.29` at 2fef47c7, on top of live 0.28.2, with the hotfix line
`release/0.28.3` read for its art): the nine doors rebuilt (Guard, Momentum, Pressure, Shadow, Sigils, Figments, Bonds and
Tending, the Outburst, prayer), the 18 alpha perks rebuilt, the Open Hand glove family, and everything else a player sees that
has **no art of its own**, shows **art that means something else**, or shows **a letter or a code glyph** standing in. It was
found by reading every data row a screen draws (`data/*.json`) against `art/catalog.json`, the built asset map
(`apps/web/src/game/assets.json`) and the client's lookups (`docs/ART-INTEGRATION.md`; `gearIcons.ts`, `figmentIcons.ts`,
`faithArt.ts`, `classIcons.ts`, `doorView.ts`), and against the "Art" sections of tonight's drafts (`docs/design/proposals/
2026-11-*-2.0.md`, `2026-11-unarmed.md`, `2026-11-guard-2.0.md`). Every picture below is **invented here**, on Leon's word:
change any of them freely, as long as each stays distinct at 32 px from its neighbours.

**375 images: 310 for things in the game now, 65 for things designed but not built.** Every in-game one without art of its own now has a **placeholder** (section "Placeholders"): **305 made, 20 of them drawn by a screen today**; the rest wait for a screen slot ("No slot yet").

## Counts

| Kind (mode, size) | In game now | Designed, not built | Total |
| --- | --- | --- | --- |
| Wick icon (1024 x 1024 PNG, transparent) | 242 | 38 | 280 |
| white-ink sign (1024 x 1024 PNG, transparent) | 61 | 5 | 66 |
| door emblem (1024 x 1024 PNG, transparent) | 0 | 9 | 9 |
| monoline icon (SVG, 64 grid) | 1 | 4 | 5 |
| painted gear icon (1024 x 1024 PNG, transparent) | 5 | 0 | 5 |
| Figment portrait (800 x 1000 PNG) | 1 | 0 | 1 |
| class portrait (800 x 1000 PNG) | 0 | 9 | 9 |
| **All** | **310** | **65** | **375** |

| Section (door, class) | In game now | Designed, not built | Total |
| --- | --- | --- | --- |
| Durability: Guard, and the Bulwark | 14 | 8 | 22 |
| Raw Power: the Momentum chain, and the Breaker | 20 | 8 | 28 |
| Dexterity: Pressure, and the Skirmisher | 23 | 6 | 29 |
| Ingenuity: Shadow, and the Operative | 35 | 8 | 43 |
| Brain Power: Sigils, and the Sigilist | 10 | 2 | 12 |
| Visualization: Figments, and the Rigger | 30 | 6 | 36 |
| Empathy: Bonds and Tending, and the Mender | 25 | 12 | 37 |
| Will Power: the Outburst, and the Channeler | 10 | 2 | 12 |
| Faith: prayer, and the Chaplain | 26 | 5 | 31 |
| The monk's gloves (the Open Hand) | 13 | 3 | 16 |
| Survival and camp | 0 | 5 | 5 |
| Conditions and states | 50 | 0 | 50 |
| Shared: the weapon techniques | 54 | 0 | 54 |

Not counted: three pictures that exist and were only unwired (Survival's lobby card, the medic, Contraband): wired in this change.

## Painting order (what a player sees most, first)

1. **The 18 alpha perks** (numbers in each door's section, marked *shows the OLD perk's icon*). Every alpha skill's perk steps,
   the level-up screen, the skill road map and the perk cards show them; today each shows the icon of the perk
   that used to have its id. Paint these first, in door order.
2. **The Open Hand** (gear icon) and **Glimmer** (monoline): both drawn by a screen today, on a placeholder.
3. **The door verbs a player presses every fight** (Durability's Guard moves, the Breaker's and Skirmisher's gains, the Shadow
   verbs, the Tend verbs, the Figment orders, the Chaplain's gains and the Open Hand forms): no screen draws an icon for an
   action row yet, so they are ready for the day the row gets one (Leon's call: "No slot yet").
4. **The conditions** (on every token, the hover card and the log): 50 signs.
5. **The class rank moves** (each door's section) and **the weapon techniques** (Shared).
6. **The nine class portraits and the nine door emblems** (designed: the class card and the door tab have no art slot).
7. **The painted gloves** (they show their monoline icon today) and the Scrap Turret's portrait.
8. **The designed-but-not-built rows** of each section, when their slice is built.

## Read this first

- **One image a prompt.** For each row, paste **the base prompt of its mode (below), then the row's "Paint" text, then
  "Avoid: " and the row's "Avoid" text**, and attach the references the mode names. That is the ready-to-paste prompt.
- **Names.** Each row gives the **catalog id the game looks up** and the **file name to save**. Do not rename. The placeholder
  sits under the same catalog id today (`placeholder: true`); the delivery replaces it by id with no code change. For the 18
  perks, save the new icon under the perk's own file name (`art/icons/perks/<id>.png`): the old icon moves to
  `art/_archive/perks/wick/replaced/` (Claude does it on intake).
- **Review.** Every delivery is a review candidate until Leon approves it; Claude adds the catalog entries, runs
  `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py` and `npm run assets`. Deliver on a branch
  `art/nine-doors-2026-11-16` with one contact sheet per section, every icon checked at 32 and 44 px on `#10151F`.
- **In-world only.** Everything is invented: no real-world brands, insignia, religions, makes, films or characters; a medical
  mark is a plain plus, never a red cross; no text, letters or numbers in any image. Lore: `docs/lore/`. Nanobots are mana.
- **Inks.** The door's ink (`art/style-guide/palette.json`, `ui_ink`) is what the UI puts round an icon; **Wick icons and signs
  are pure white** (the game tints them as a mask). Only painted gear icons and portraits carry colour.

## The base prompts, one per art mode

### Wick icon (perks, door moves, class moves, techniques, Tend and Shadow verbs, Figment orders and traits, prayers)

**Attach:** `art/icons/traits/mind-without-fog.png` (the master), three of `art/icons/perks/*.png` (the line weight; not the
perk being replaced), and for prayers two of `art/icons/prayers/whisper-*.png`. Rule: `art/icons/STYLE-LOCK.md`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached
> reference icons: Wick, the small flame-headed figure of the trait and perk icons, in bold flat white shapes, a confident
> inked silhouette with a few interior cuts, the same line weight. No outline in another colour, no shading, no gradient, no
> texture, no glow, no colour and no grey. Wick is the only full figure; anyone else is a partial (a hand, a shoulder, a
> silhouette cut by the frame). One action, centred, with clear space around it, square, 1024 x 1024 PNG with transparency.
> It must read at 32 px in a row and at 44 px on a chip: silhouette first, two or three interior cuts at most. No text, no
> letters, no numbers, no border, no frame. Invented shapes only: nothing recognisable from real-world works, brands, insignia
> or religions (a medical mark is a plain plus, never a red cross). The icon shows:

### White-ink sign (conditions, camp steps) and door emblem

**Attach:** `art/icons/traits/mind-without-fog.png`, `art/icons/survival/markers/shop.png` and `art/icons/boons/edge.png`
(delivered non-figure icons of this family).

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached
> reference icons (bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight). No
> outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. This icon is a sign, not a
> scene: Wick does not appear; a small generic silhouette may. One subject, centred, with clear space around it, square,
> 1024 x 1024 PNG with transparency. It must read at 24 px beside a word on a token and at 48 px on a card: silhouette first,
> two interior cuts at most. A door emblem must also read inside a 20 px chip. No text, no letters, no numbers, no border,
> no frame. Invented shapes only. The icon shows:

### Monoline icon (Figment forms)

**Rule:** `art/style-guide/weapon-icons.md`; references `art/icons/figments/figment-*.svg`. Claude can draw these in house;
the prompt is for a generator that returns SVG, or a clean 1024 PNG line drawing Claude traces.

> Draw one monoline icon on a 64 x 64 grid: a single 2-unit round-capped, round-joined stroke in one colour, no fill, no
> shading, one clear silhouette outline plus at most three interior lines, readable at 32 px; the same hand as the attached
> Figment line icons. The shape is a Figment, a picture given a body by nanobots: one or two edges break into three small
> dots. No text, no letters, no frame. The icon shows:

### Painted gear icon (the Open Hand, the gloves)

**Attach:** two finished gear icons of the family from `art/icons/gear/` (`weapon-knuckledusters.png`,
`weapon-hellraiser_servo_fist.png`), `art/sprites/objects/tool-rack.png`, `art/portraits/world/new-faces/orren-vask.png`.

> Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush
> strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows,
> warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D
> render. One single object, three-quarter view, lit from the upper left, a short soft painted shading on its own underside
> only: no ground, no cast shadow, no scene. Fully transparent background, 1024 x 1024 PNG with alpha; the object fills about
> 80% of the canvas. No text, letters, numbers, logos, maker marks, borders, hands or figures. Invented, never a real make.
> Bold silhouette first: it is shown at 64 px in a shop grid and 32 px in a backpack row. The object:

### Class portrait (Heavenprint portrait mode)

**Attach:** `art/portraits/world/new-faces/orren-vask.png`, `.../ivara-drenn.png`, two archetype cards from
`art/portraits/archetypes/`, and the class's code-drawn emblem (`apps/web/src/game/class-icons-sheet.png` if present, else a
screenshot of the class card) so the portrait carries its motif.

> Create an original Project Heaven Cry illustration in HEAVENPRINT. Use the attached approved Original 27 and New Faces
> images as the painting authority: expressive ink and opaque gouache, deliberate angular form, selective dry-brush
> scumbling, restrained hatching, charcoal lost edges and warm ivory accents. Faces have believable anatomy and restrained
> stylization and specific emotional acting. Format: 4:5, 800 x 1000 PNG, one character from the chest or waist up, one
> visible action, one specific emotion, one useful setting hint behind them; the eye line about 22% from the top. The class
> attribute's pigment appears only as one accent (given in the section). No text, frame, UI or watermark; no real-world
> person, brand or recognisable character. The portrait shows:

### Figment portrait (abstract portrait mode)

Use the base prompt and the attachments of `GPT-PROMPTS-2026-11-15-figments.md` ("Base prompt"), with the row's Paint as the
subject. 800 x 1000 PNG, the subject inside the central circle (about 560 px across, centred at 400, 480).

## Durability: Guard, and the Bulwark

**Door:** Durability (its alpha skill opens it). **Class:** Bulwark (id `defender`). **Ink:** Endurance `#F65157`. Guard 2.0 slice 1 (`docs/design/proposals/2026-11-guard-2.0.md`): plates on the token (SVG, no art), Challenge, Slam, Retort, Last Plate, Close Guard and Set Against the Blow on Durability's door (`data/skills.json`), the tank fit (roll_with, Guard 4). The Buckler has its painting and line icon.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `perks` `bulwark` | `art/icons/perks/bulwark.png` | Weight of the Wall | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Durability perk (was Stonewall: the old icon shows Wick bracing a riot shield) | Wick braced low behind a raised round shield, swinging a short hammer over its rim at a foe out of frame; the shield takes the blow, the hammer answers it. | a plain shield pose with no strike (that is the old Stonewall) · a full second figure |
| 2 | `perks` `shrug-it-off` | `art/icons/perks/shrug-it-off.png` | Answer in Kind | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Durability perk (the old icon shows Wick shrugging off a condition) | Wick rocked back on one heel by a blow (three short impact lines at his shoulder), his other fist already thrown forward in answer. | shrugging shoulders (the old icon) · any blood |
| 3 | `move_icons` `move-close-guard` | `art/icons/moves/close-guard.png` | Close Guard | Wick icon | in game now · placeholder · no slot yet | Durability door, holding Guard: takes part of a blow aimed at an adjacent ally | Wick with one arm thrown round a smaller partial figure at his side, a curved plate-arc over both their heads. | two equal figures hugging · a full shield wall |
| 4 | `move_icons` `move-last-plate` | `art/icons/moves/last-plate.png` | Last Plate | Wick icon | in game now · placeholder · no slot yet | Durability 5: once a fight a hit that would drop you leaves you on 1 HP and breaks every plate | Wick down on one knee, one cracked plate left standing in front of him like a gravestone, the others in shards at his feet. | a skull · a heart or HP bar |
| 5 | `move_icons` `move-retort` | `art/icons/moves/retort.png` | Retort | Wick icon | in game now · placeholder · no slot yet | Durability door: a guarded hit answers back | Wick snapping one open hand forward from behind his guard, a sharp chevron leaving the palm. | a weapon swing · any text-like mark |
| 6 | `move_icons` `move-challenge` | `art/icons/moves/challenge.png` | Challenge | Wick icon | in game now · placeholder · no slot yet | Durability 3: taunts a foe to come at you | Wick thumping his own chest with a fist, two small curved arrows bending in toward him from both sides. | a pointing finger (that is Taunt, a Call) · an angry face |
| 7 | `move_icons` `move-slam` | `art/icons/moves/slam.png` | Slam | Wick icon | in game now · placeholder · no slot yet | Durability 5: a shield or body slam that shoves | Wick dropped to one knee, both palms flat on the ground, three short shock lines fanning out from his hands. | a fist punch · a crater with debris clouds |
| 8 | `move_icons` `move-set-against-the-blow` | `art/icons/moves/set-against-the-blow.png` | Set Against the Blow | Wick icon | in game now · placeholder · no slot yet | Durability perk step: braced, the next blow is turned | Wick braced side-on, a small star of impact cracking on his raised forearm, feet set wide. | a shield (this is the bare arm) · motion blur |
| 9 | `move_icons` `move-brace` | `art/icons/moves/brace.png` | Brace | Wick icon | in game now · placeholder · no slot yet | Bulwark rank I move: Braced for a round, harder to move | Wick planted, knees bent, feet wide, both forearms crossed in front of his flame. | any weapon · a wall behind him |
| 10 | `move_icons` `move-draw-fire` | `art/icons/moves/draw-fire.png` | Draw Fire | Wick icon | in game now · placeholder · no slot yet | Bulwark rank I move: pulls enemy attacks onto you | Wick standing tall with both arms spread wide, three small arrow-darts curving toward his chest from out of frame. | a target ring (that is aiming) · a shield |
| 11 | `move_icons` `move-unbroken` | `art/icons/moves/unbroken.png` | Unbroken | Wick icon | in game now · placeholder · no slot yet | Bulwark rank II move (from the Adamantile Knight): keeps standing through a killing blow | Wick standing straight with a long crack running down his body like a cracked statue, still upright. | lying down · wings or halo |
| 12 | `move_icons` `move-shrug-it-off-move` | `art/icons/moves/shrug-it-off-move.png` | Shrug It Off (move) | Wick icon | in game now · placeholder · no slot yet | Bulwark rank II move: ends Bleeding, Slowed, Weakened or Prone at once for Guard | Wick rolling his shoulders, four small loose bands (conditions) falling away from his arms to the ground. | the perk of the same id's picture (the perk is now Answer in Kind) · chains |
| 13 | `move_icons` `move-reactive-plate` | `art/icons/moves/reactive-plate.png` | Reactive Plate | Wick icon | in game now · placeholder · no slot yet | Bulwark rank III move: plate that hardens when hit | A single armour plate on Wick's shoulder flaring with a small burst of short rays where a dart has struck it. | fire or explosion texture · a full suit of armour |
| 14 | `move_icons` `move-anchor` | `art/icons/moves/anchor.png` | Anchor | Wick icon | in game now · placeholder · no slot yet | Bulwark rank III move: while Braced you can't be moved, and foes leaving you provoke | Wick standing on a ship's anchor shape sunk into the ground line, a short chain from his belt to it. | a real ship · water |
| 15 | `door_emblems` `door-guard` | `art/emblems/doors/guard.png` | Guard plate (door emblem) | door emblem | designed, not built | The door's one mark for the door tab, the tip and the token chip: today the plates are SVG pips | A single curved armour plate seen front-on, two rivets, one notch on its edge. | a heater shield (the Guard boon line already uses a buckler) · any letter |
| 16 | `class_portraits` `class-defender` | `art/portraits/classes/defender.png` | The Bulwark (class portrait) | class portrait | designed, not built | A portrait for the class card and the level-3 choice; today the class shows its code-drawn emblem only | A broad, steady person in scuffed plate with a Buckler on the forearm, planted in a doorway, looking past the viewer at what is coming; warm firelight from one side. | a recognisable knight from any known work · a raised sword pose |
| 17 | `move_icons` `move-wall` | `art/icons/moves/wall.png` | Wall | Wick icon | designed, not built | Guard 2.0 next slice: become a wall for a round | Wick behind a tall slab of stone he holds upright, feet set wide behind it. | a brick wall texture · a castle |
| 18 | `move_icons` `move-hold-the-gap` | `art/icons/moves/hold-the-gap.png` | Hold the Gap | Wick icon | designed, not built | Guard 2.0 next slice: hold a doorway | Wick's arm barring a narrow doorway from frame to frame, his body in the gap. | a door with a lock · a second figure |
| 19 | `move_icons` `move-the-shield-follows` | `art/icons/moves/the-shield-follows.png` | The Shield Follows | Wick icon | designed, not built | Guard 2.0 next slice: the shield swings after the blade | Wick swinging a round shield edge-first in the arc right behind a blade stroke. | two weapons crossed · a spinning blur |
| 20 | `move_icons` `move-weather-the-volley` | `art/icons/moves/weather-the-volley.png` | Weather the Volley | Wick icon | designed, not built | Guard 2.0 next slice: ranged hits glance off | Wick hunched forward, three short dashes glancing off the curve of his back. | rain · an umbrella |
| 21 | `move_icons` `move-bastion` | `art/icons/moves/bastion.png` | Bastion (path mark) | Wick icon | designed, not built | Guard 2.0 path mark | Wick standing behind a low parapet of stacked blocks, only his head and shoulders above it. | a castle tower · flags |
| 22 | `move_icons` `move-bulwarks-edge` | `art/icons/moves/bulwarks-edge.png` | Bulwark's Edge (path mark) | Wick icon | designed, not built | Guard 2.0 path mark | Wick advancing with a shield's rim leading, the rim a hard bright line. | a sword · a spiked shield |

## Raw Power: the Momentum chain, and the Breaker

**Door:** Raw Power (its alpha skill opens it). **Class:** Breaker (id `fighter`). **Ink:** Strength `#F68A38`. Momentum 2.0 (`2026-11-momentum-2.0.md`): the counter chip and arcs are SVG; the Breaker's gains (The Charge Carries, Four Ways to Finish, Launch, Wrecker, Breach) and the four finishers are in the game with no icon.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 23 | `perks` `breaching-strike` | `art/icons/perks/breaching-strike.png` | Keep Swinging | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Raw Power perk (the old icon shows Wick breaching a door) | Wick with one foe falling at his feet, his blade already wound back over the shoulder for the next swing. | a door or wall (that is the old Breaching Strike) · a pile of bodies |
| 24 | `perks` `grapple` | `art/icons/perks/grapple.png` | Iron Grip | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Raw Power perk, meaning changed (the old icon, catalog `grapple`, shows Wick grappling) | Wick pinning a foe flat to the floor with one hand on its chest, the other fist raised high. | two figures wrestling standing up (the old Grapple) · a choke |
| 25 | `move_icons` `move-follow-through` | `art/icons/moves/follow-through.png` | Follow Through | Wick icon | in game now · placeholder · no slot yet | Raw Power door step | Wick after a full swing, his body turned through, a long curved motion line trailing behind the weapon. | a second foe · sparks |
| 26 | `move_icons` `move-heavy-hands` | `art/icons/moves/heavy-hands.png` | Heavy Hands | Wick icon | in game now · placeholder · no slot yet | Raw Power door step | Wick's two fists hanging heavy at his sides, each with two short downward weight lines under it. | a dumbbell or gym gear · muscles drawn in anatomy detail |
| 27 | `move_icons` `move-the-charge-carries` | `art/icons/moves/the-charge-carries.png` | The Charge Carries | Wick icon | in game now · placeholder · no slot yet | Breaker gain: a Charge's momentum carries into the next blow | Wick mid-charge, low and forward, a long speed line behind him that bends up into his raised fist. | a horse or vehicle · a battering ram |
| 28 | `move_icons` `move-four-ways-to-finish` | `art/icons/moves/four-ways-to-finish.png` | Four Ways to Finish | Wick icon | in game now · placeholder · no slot yet | Breaker gain: Cleave, Break and Coup with any melee weapon | Four short blade strokes meeting at one point like a compass rose, Wick's hand at the centre. | a real compass · a clock |
| 29 | `move_icons` `move-launch` | `art/icons/moves/launch.png` | Launch | Wick icon | in game now · placeholder · no slot yet | Breaker gain: throws a foe or a crate across the field | Wick heaving a crate-sized block up over his head, knees bent, about to throw. | a barbell · a real shipping logo on the crate |
| 30 | `move_icons` `move-wrecker` | `art/icons/moves/wrecker.png` | Wrecker | Wick icon | in game now · placeholder · no slot yet | Breaker gain: breaks cover and objects | Wick with a sledge resting on one shoulder beside a split crate, splinters as short lines. | fire · a building collapsing |
| 31 | `move_icons` `move-breach` | `art/icons/moves/breach.png` | Breach | Wick icon | in game now · placeholder · no slot yet | Breaker gain: smash through a wall | Wick's fist punched through a plank wall, splinters bursting out as straight lines on the far side. | a door with a handle (that is Breaching Strike's old picture) · glass |
| 32 | `move_icons` `move-lunge` | `art/icons/moves/lunge.png` | Lunge | Wick icon | in game now · placeholder · no slot yet | Breaker rank I move (and a technique): a long step and strike | Wick in a deep lunge, back leg straight, blade point leading far ahead. | fencing gear · a second figure |
| 33 | `move_icons` `move-shove` | `art/icons/moves/shove.png` | Shove | Wick icon | in game now · placeholder · no slot yet | Breaker rank I move: push a foe back or knock it Prone | Wick pushing with both palms flat, a small partial figure tipping backwards off the edge of the frame. | a punch · a cliff |
| 34 | `move_icons` `move-riposte` | `art/icons/moves/riposte.png` | Riposte | Wick icon | in game now · placeholder · no slot yet | Breaker rank II move: an answer after a parry | Wick turning a foe's blade aside with his own and snapping the point straight back in one motion, a small hook arrow showing the turn. | two crossed swords standing still · sparks |
| 35 | `move_icons` `move-lingering-dread` | `art/icons/moves/lingering-dread.png` | Lingering Dread | Wick icon | in game now · placeholder · no slot yet | Breaker rank II move (from the Shade): a hit that leaves Fear | Wick standing over a cowering partial figure, a long shadow from him falling across it. | horror faces · skulls |
| 36 | `move_icons` `move-finisher` | `art/icons/moves/finisher.png` | Finisher | Wick icon | in game now · placeholder · no slot yet | Breaker rank III move: a heavy blow on a weakened foe | Wick with both hands over his head on a long haft, about to bring it down. | blood · an executioner's hood |
| 37 | `move_icons` `move-unstoppable` | `art/icons/moves/unstoppable.png` | Unstoppable | Wick icon | in game now · placeholder · no slot yet | Breaker rank III move: no Fear, no opportunity attacks for a turn | Wick walking straight through three small darts that bend away from him, chin up. | a forcefield bubble · flames |
| 38 | `technique_icons` `tech-coup` | `art/icons/techniques/coup.png` | Coup | Wick icon | in game now · placeholder · no slot yet | Technique, finisher: an Execute on a foe under half HP for the Breaker | A short decisive downward stroke ending on a small cracked ring (the foe's last health), Wick's arm at the top of the stroke. | a crown · a guillotine |
| 39 | `technique_icons` `tech-cleave` | `art/icons/techniques/cleave.png` | Cleave | Wick icon | in game now · placeholder · no slot yet | Technique, finisher: one swing through several foes | Wick's weapon carving one wide flat arc that passes through three short upright posts. | a meat cleaver · gore |
| 40 | `technique_icons` `tech-break` | `art/icons/techniques/break.png` | Break | Wick icon | in game now · placeholder · no slot yet | Technique, finisher: a blow that leaves the target Exposed | A heavy blow landing on a small round shield, the shield cracking in two. | bones · glass shards |
| 41 | `technique_icons` `tech-throw-down` | `art/icons/techniques/throw-down.png` | Throw Down | Wick icon | in game now · placeholder · no slot yet | Technique, finisher: a throw to the ground | Wick hip-tossing a partial figure over his hip toward the ground line. | wrestling ring ropes · a mat |
| 42 | `technique_icons` `tech-run-through` | `art/icons/techniques/run-through.png` | Run Through | Wick icon | in game now · placeholder · no slot yet | Technique, finisher: a thrust through | A long straight thrust passing through a ring and out the far side, Wick's arm extended. | a skewered body · blood |
| 43 | `door_emblems` `door-momentum` | `art/emblems/doors/momentum.png` | Momentum counter (door emblem) | door emblem | designed, not built | The door's mark: today the counter chip and arcs are SVG | A heavy round weight with three curved motion lines rolling off its back edge. | a bowling ball · a clock |
| 44 | `class_portraits` `class-fighter` | `art/portraits/classes/fighter.png` | The Breaker (class portrait) | class portrait | designed, not built | Class card portrait | A heavy-shouldered fighter mid-stride with a war axe resting on one shoulder, dust kicked up, grinning at the next wall to go through. | a barbarian from a known work · bare-chested pin-up pose |
| 45 | `move_icons` `move-bowl-over` | `art/icons/moves/bowl-over.png` | Bowl Over | Wick icon | designed, not built | Momentum 2.0 next slice | Wick shoulder-first, mid-stride, a small figure tipping over in front of him. | a bowling pin · a vehicle |
| 46 | `move_icons` `move-execute` | `art/icons/moves/execute.png` | Execute | Wick icon | designed, not built | Momentum 2.0: the Coup's named finish (today a label on the Coup) | Wick with both hands over his head on a long haft, the blade a hard bright line, a small ring below it. | an executioner's hood · a block |
| 47 | `move_icons` `move-into-the-wall` | `art/icons/moves/into-the-wall.png` | Into the Wall | Wick icon | designed, not built | Momentum 2.0 next slice | Wick pushing with both palms, a partial figure pressed flat against a wall line at the far side. | bricks with text · blood |
| 48 | `move_icons` `move-hurl` | `art/icons/moves/hurl.png` | Hurl | Wick icon | designed, not built | Momentum 2.0 next slice | Wick mid-throw of a barrel, one arm whipping through, the barrel leaving his hand. | a real brand on the barrel · fire |
| 49 | `move_icons` `move-demolisher` | `art/icons/moves/demolisher.png` | Demolisher (path mark) | Wick icon | designed, not built | Momentum 2.0 path mark | Wick standing on a heap of rubble, a sledge planted head-down beside him. | a building · smoke clouds |
| 50 | `move_icons` `move-duelist` | `art/icons/moves/duelist.png` | Duelist (path mark) | Wick icon | designed, not built | Momentum 2.0 path mark | Wick side-on in a guard, one hand forward, a slim blade held back. | fencing mask · a rapier from any known work |

## Dexterity: Pressure, and the Skirmisher

**Door:** Dexterity (its alpha skill opens it). **Class:** Skirmisher (id `marksman`). **Ink:** Agility `#E3BF51`. Pressure 2.0 (`2026-11-pressure-2.0.md`, `data/pressure.json`): the pips and lanes are SVG; Fire and Move, Relocated, Break Them, Slide, Near Miss and Shaken Nerves are in the game with no icon.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 51 | `perks` `both-hands` | `art/icons/perks/both-hands.png` | Pressure Point | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Dexterity perk (the old icon shows Wick with a sword and a pistol: Both Hands) | Wick aiming down a rifle at a partial figure cowering behind low cover, one sharp sight-line between them. | a sword in the other hand (that is the old Both Hands) · a crosshair overlay |
| 52 | `perks` `running-reload` | `art/icons/perks/running-reload.png` | Keep Their Heads Down | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Dexterity perk (the old icon shows Wick reloading on the run) | Wick firing a spray over a low wall, three small dust kicks along its top edge. | a magazine change (the old Running Reload) · muzzle-flash fire |
| 53 | `move_icons` `move-quick-draw` | `art/icons/moves/quick-draw.png` | Quick Draw | Wick icon | in game now · placeholder · no slot yet | Dexterity door step | Wick's hand already clear of the holster, the pistol level, a single short speed line behind it. | a cowboy hat · a western duel setting |
| 54 | `move_icons` `move-speed-load` | `art/icons/moves/speed-load.png` | Speed Load | Wick icon | in game now · placeholder · no slot yet | Dexterity door step | A magazine dropping free from a pistol grip while a fresh one rises into it, two curved arrows. | a revolver cylinder · text on the magazine |
| 55 | `move_icons` `move-near-miss` | `art/icons/moves/near-miss.png` | Near Miss | Wick icon | in game now · placeholder · no slot yet | Dexterity door: a miss still adds Pressure | Wick firing, a bullet line passing just over a ducking partial head. | a hit with blood · a skull |
| 56 | `move_icons` `move-shaken-nerves` | `art/icons/moves/shaken-nerves.png` | Shaken Nerves | Wick icon | in game now · placeholder · no slot yet | Dexterity door: a Pressured foe is Shaken | Wick leaning in over cover toward a small trembling figure behind it, three short shake lines round the figure. | a scared cartoon face · sweat drops |
| 57 | `move_icons` `move-reflex` | `art/icons/moves/reflex.png` | Reflex | Wick icon | in game now · placeholder · no slot yet | Skirmisher gain: a second reaction | Wick twisting out of the way of two darts at once, two small curved arrows round him. | a lightning bolt · a ninja |
| 58 | `move_icons` `move-fire-and-move` | `art/icons/moves/fire-and-move.png` | Fire and Move | Wick icon | in game now · placeholder · no slot yet | Skirmisher gain: move after you fire, free | Wick mid-stride, gun arm still pointed back over his shoulder, a short trail behind his feet. | running away unarmed · a cape |
| 59 | `move_icons` `move-relocated` | `art/icons/moves/relocated.png` | Relocated | Wick icon | in game now · placeholder · no slot yet | Skirmisher gain: a step into cover, gun up | Wick landing from a step, gun raised, a small dust puff at his heel. | a jump with a rocket · a parachute |
| 60 | `move_icons` `move-break-them` | `art/icons/moves/break-them.png` | Break Them | Wick icon | in game now · placeholder · no slot yet | Skirmisher gain: a Pressured foe breaks and runs | Wick lowering the gun, a small figure running away out of frame. | a white flag (that is surrender) · a chase |
| 61 | `move_icons` `move-slide` | `art/icons/moves/slide.png` | Slide | Wick icon | in game now · placeholder · no slot yet | Pressure move (`pressure.slide`): slide into cover | Wick on his side sliding into a crate, a long low dust trail behind. | a skateboard · a playground slide |
| 62 | `move_icons` `move-fire-discipline` | `art/icons/moves/fire-discipline.png` | Fire Discipline | Wick icon | in game now · placeholder · no slot yet | Skirmisher rank I move | Wick with the rifle tight to the shoulder, three short evenly spaced shot ticks in a row. | a spray of bullets · a metronome |
| 63 | `move_icons` `move-speed-loader` | `art/icons/moves/speed-loader.png` | Speed Loader | Wick icon | in game now · placeholder · no slot yet | Skirmisher rank I move: the first reload or swap is cheaper | A ring of six rounds held in a clip, sliding toward a revolver's open cylinder. | a real-world revolver make · text on the rounds |
| 64 | `move_icons` `move-special-ammo` | `art/icons/moves/special-ammo.png` | Special Ammo | Wick icon | in game now · placeholder · no slot yet | Skirmisher rank II move | One round standing taller than two plain ones beside it, its tip marked with a small star cut. | glowing magic effects · a rocket |
| 65 | `move_icons` `move-duck-and-roll` | `art/icons/moves/duck-and-roll.png` | Duck and Roll | Wick icon | in game now · placeholder · no slot yet | Skirmisher rank II move: a step before a shot is rolled | Wick tucked into a roll, a dart passing through the space he just left. | a bowling ball · a ninja |
| 66 | `move_icons` `move-killzone` | `art/icons/moves/killzone.png` | Killzone | Wick icon | in game now · placeholder · no slot yet | Skirmisher rank III move | A rectangle marked on the ground by four corner ticks, Wick's sight-line across it. | a crosshair over a person · skulls |
| 67 | `move_icons` `move-run-and-gun` | `art/icons/moves/run-and-gun.png` | Run and Gun | Wick icon | in game now · placeholder · no slot yet | Skirmisher rank III move: a free move after an attack | Wick running hard, the gun held level and steady while his legs blur. | a vehicle · flames |
| 68 | `technique_icons` `tech-suppress` | `art/icons/techniques/suppress.png` | Suppress | Wick icon | in game now · placeholder · no slot yet | Technique, press: pins a foe down | A low burst of four bullet lines raking just over a crate's top edge. | a soldier's helmet with insignia · fire |
| 69 | `technique_icons` `tech-rake` | `art/icons/techniques/rake.png` | Rake | Wick icon | in game now · placeholder · no slot yet | Technique, press: sweeps a line | A sweeping fan of short bullet lines spreading across the ground. | a garden rake · blood |
| 70 | `technique_icons` `tech-warning-shot` | `art/icons/techniques/warning-shot.png` | Warning Shot | Wick icon | in game now · placeholder · no slot yet | Technique, press | A single bullet line striking the ground just in front of a partial foot, a small dust kick. | a firework · a flare |
| 71 | `technique_icons` `tech-flush` | `art/icons/techniques/flush.png` | Flush | Wick icon | in game now · placeholder · no slot yet | Technique, press: drives a foe from cover | A burst striking the side of a crate, a small figure scrambling out of the far side. | a bird · water |
| 72 | `technique_icons` `tech-mag-dump` | `art/icons/techniques/mag-dump.png` | Mag Dump | Wick icon | in game now · placeholder · no slot yet | Technique, press: empties the magazine | A gun with a long straight line of spent cases pouring out of its side. | a machine gun nest · a real make |
| 73 | `technique_icons` `tech-crossfire` | `art/icons/techniques/crossfire.png` | Crossfire | Wick icon | in game now · placeholder · no slot yet | Technique, press: two lines of fire cross | Two bullet lines crossing at one point from opposite sides. | crossed swords · an X on a map |
| 74 | `door_emblems` `door-pressure` | `art/emblems/doors/pressure.png` | Pressure pips (door emblem) | door emblem | designed, not built | The door's mark: today the pips are SVG | Three short rising chevrons stacked one above the other, like a meter climbing. | a military rank insignia · a wifi signal |
| 75 | `class_portraits` `class-marksman` | `art/portraits/classes/marksman.png` | The Skirmisher (class portrait) | class portrait | designed, not built | Class card portrait | A lean runner in a dusty coat, half crouched at the corner of cover, rifle up, already looking at the next cover. | a real army uniform or insignia · a sniper in a ghillie suit |
| 76 | `move_icons` `move-flush-out` | `art/icons/moves/flush-out.png` | Flush Out | Wick icon | designed, not built | Pressure 2.0 next slice | Wick shooting a crate apart, a figure scrambling out. | explosions · fire |
| 77 | `move_icons` `move-open` | `art/icons/moves/open.png` | Open | Wick icon | designed, not built | Pressure 2.0 next slice | Wick pointing two fingers at a target, an opened bracket shape round it. | a crosshair · text brackets |
| 78 | `move_icons` `move-suppressor` | `art/icons/moves/suppressor.png` | Suppressor (path mark) | Wick icon | designed, not built | Pressure 2.0 fork | Wick prone behind a bipod rifle. | a sniper scope glint · a real make |
| 79 | `move_icons` `move-runner` | `art/icons/moves/runner.png` | Runner (path mark) | Wick icon | designed, not built | Pressure 2.0 fork | Wick vaulting a low wall one-handed, gun in the other. | parkour logos · a city skyline |

## Ingenuity: Shadow, and the Operative

**Door:** Ingenuity (its alpha skill opens it). **Class:** Operative (id `infiltrator`). **Ink:** Perception `#40BAA0`. Shadow 2.0 slices 1-2 (`2026-11-shadow-2.0.md`): a findable Hide, hide tiles, Tag and Ghost Kill; the effects are SVG in `fx/shadow.ts`. The sixteen Shadow verbs (`data/shadow.json`) have no icon; the four group marks Slip, Mark, Work and Break were asked for on 13 Nov (C2) and never delivered.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 80 | `perks` `sleight-of-hand` | `art/icons/perks/sleight-of-hand.png` | Long Dark | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Ingenuity perk (the old icon shows Wick palming a card: Sleight of Hand) | Wick half hidden in a band of shadow, only one shoulder and a knife held low catching the light. | a playing card or coin (the old icon) · a full black blob |
| 81 | `perks` `shadow-step` | `art/icons/perks/shadow-step.png` | Shadow Step | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Ingenuity perk, meaning changed (old icon: Wick stepping between shadows) | Wick stepping out of a shadow mid-strike, one foot still sunk in the dark pool behind him. | teleport sparkles · a portal ring |
| 82 | `move_icons` `move-hide` | `art/icons/moves/hide.png` | Hide | Wick icon | in game now · placeholder · no slot yet | The Hide action (`actions.json hide`), findable since Shadow 2.0 | Wick crouched behind a crate, his flame turned low to a small ember. | a cardboard box over his head · closed eyes |
| 83 | `move_icons` `move-first-shade` | `art/icons/moves/first-shade.png` | First Shade | Wick icon | in game now · placeholder · no slot yet | Ingenuity door step | Wick pulling a hood over his flame. | a monk's habit · a face under the hood |
| 84 | `move_icons` `move-ghost-kill` | `art/icons/moves/ghost-kill.png` | Ghost Kill | Wick icon | in game now · placeholder · no slot yet | Ingenuity 3: a kill from Hidden leaves you Hidden | Wick behind a fallen figure, a finger raised to where his lips would be. | blood · a skull |
| 85 | `move_icons` `move-go-to-ground` | `art/icons/moves/go-to-ground.png` | Go to Ground | Wick icon | in game now · placeholder · no slot yet | Ingenuity door step | Wick flat on his belly in tall grass lines, only his flame showing. | a foxhole with sandbags · a mole |
| 86 | `move_icons` `move-close-quarters` | `art/icons/moves/close-quarters.png` | Close Quarters | Wick icon | in game now · placeholder · no slot yet | Ingenuity door step | Wick pressed flat against a wall corner, a knife held close to his chest. | a doorway with a sign · a gun |
| 87 | `move_icons` `move-shadow-run` | `art/icons/moves/shadow-run.png` | Shadow Run | Wick icon | in game now · placeholder · no slot yet | Ingenuity door step | Wick running bent low along a wall line, his shadow stretched long beside him. | a superhero pose · motion blur trails everywhere |
| 88 | `move_icons` `move-still-breath` | `art/icons/moves/still-breath.png` | Still Breath | Wick icon | in game now · placeholder · no slot yet | Ingenuity door step | Wick motionless, eyes closed, a single thin wisp rising straight up from his flame. | meditation pose (that is the monk's Breath) · smoke clouds |
| 89 | `shadow_icons` `shadow-tag` | `art/icons/shadow/tag.png` | Tag | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Mark): marks a foe, TAGGED | Wick chalking an X on a tall silhouette's back. | a price tag · a target ring |
| 90 | `shadow_icons` `shadow-lift` | `art/icons/shadow/lift.png` | Lift | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): steals from a foe's pack | Wick's hand drawing a small pouch out of a hanging coat pocket. | money symbols · a mask |
| 91 | `shadow_icons` `shadow-fade` | `art/icons/shadow/fade.png` | Fade | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Break): was Vanish (reuses `vanishing-act` in the 13 Nov plan; no slot) | Wick dissolving from the feet up into short horizontal dashes. | smoke clouds · a magic wand |
| 92 | `shadow_icons` `shadow-read-intent` | `art/icons/shadow/read-intent.png` | Read Intent | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Mark): shows a foe's next turn | Wick watching a silhouette, a small arrow above it pointing where it will go. | a crystal ball · a brain |
| 93 | `shadow_icons` `shadow-open-seam` | `art/icons/shadow/open-seam.png` | Open Seam | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Mark): finds the weak spot | A finger tracing a seam in a plate of armour, the seam opening as a bright slit. | a sewing needle · blood |
| 94 | `shadow_icons` `shadow-timing` | `art/icons/shadow/timing.png` | Timing | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Mark): waits for the moment | Wick crouched still, a small pendulum mark swinging beside him. | a clock face with numbers · a watch brand |
| 95 | `shadow_icons` `shadow-cut-strap` | `art/icons/shadow/cut-strap.png` | Cut the Strap | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): drops a foe's weapon or pack | A short blade slicing a strap, a rifle beginning to fall. | blood · a belt buckle with a logo |
| 96 | `shadow_icons` `shadow-foul` | `art/icons/shadow/foul.png` | Foul the Action | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): jams a foe's weapon | A small wedge pushed into a gun's open action. | an explosion · a broken gun in pieces |
| 97 | `shadow_icons` `shadow-plant` | `art/icons/shadow/plant.png` | Plant | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): puts something on a foe | Wick slipping a small round object into a foe's belt pouch. | a bomb with a fuse · a plant in a pot |
| 98 | `shadow_icons` `shadow-disable` | `art/icons/shadow/disable.png` | Disable | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): turns off a machine | A hand pulling one wire from a small machine box, a spark at the cut end. | a robot face · lightning bolts |
| 99 | `shadow_icons` `shadow-hijack` | `art/icons/shadow/hijack.png` | Hijack | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): takes over a machine for a turn | A hand on a small drone's back, the drone's single lens turning toward its own side. | a pirate · a car |
| 100 | `shadow_icons` `shadow-decoy` | `art/icons/shadow/decoy.png` | Decoy | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Slip): a sound to draw foes | A small stone mid-air with two ripple rings where it will land. | a duck decoy · a speaker |
| 101 | `shadow_icons` `shadow-vault` | `art/icons/shadow/vault.png` | Vault | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Slip): over cover | Wick vaulting a low wall one-handed, low and fast. | a bank vault (this is the jump) · a pole vault |
| 102 | `shadow_icons` `shadow-pick` | `art/icons/shadow/pick.png` | Pick | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): opens a lock | Two thin picks in a keyhole of a padlock. | a guitar pick · a toothpick |
| 103 | `shadow_icons` `shadow-douse` | `art/icons/shadow/douse.png` | Douse | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): puts out a light | A hand pinching out a lamp's flame, a curl of smoke. | Wick's own flame being put out · water bucket |
| 104 | `shadow_icons` `shadow-rig` | `art/icons/shadow/rig.png` | Rig | Wick icon | in game now · placeholder · no slot yet | Shadow verb (Work): a trap on a tile | A tripwire stretched across a tile between two pegs, a small charge at one end. | a bomb with a timer · a fishing rig |
| 105 | `shadow_icons` `shadow-slip` | `art/icons/shadow/slip.png` | Slip (group mark) | Wick icon | in game now · placeholder · no slot yet | The Shadow tab's Slip group header (asked 13 Nov, C2, not delivered) | Wick's coat left hanging empty in the air where a blow lands, Wick gone. | a magic trick top hat · a banana peel |
| 106 | `shadow_icons` `shadow-mark` | `art/icons/shadow/mark.png` | Mark (group mark and Operative rank I move) | Wick icon | in game now · placeholder · no slot yet | The Mark group header and the Operative's Mark move | A small diamond mark hovering over a silhouette's shoulder, Wick's finger toward it. | a target ring · a map pin |
| 107 | `shadow_icons` `shadow-work` | `art/icons/shadow/work.png` | Work (group mark) | Wick icon | in game now · placeholder · no slot yet | The Work group header | Wick's two hands busy at a small mechanism, a thin tool in one. | a factory · a wrench (the Rigger's emblem) |
| 108 | `shadow_icons` `shadow-break` | `art/icons/shadow/break.png` | Break (group mark) | Wick icon | in game now · placeholder · no slot yet | The Work of the Break: the ambush from Shadow | A black diagonal cut across a tile with a thin white line beside it (the Break's own cut). | a broken object · blood |
| 109 | `move_icons` `move-tradecraft` | `art/icons/moves/tradecraft.png` | Tradecraft | Wick icon | in game now · placeholder · no slot yet | Operative gain | Wick turning a small notebook toward himself, a key and a picklock clipped to its cover. | text on the pages · a spy from a known work |
| 110 | `move_icons` `move-vanish` | `art/icons/moves/vanish.png` | Vanish | Wick icon | in game now · placeholder · no slot yet | Operative rank I move: Hidden when unseen | Wick stepping backwards into a doorway of darkness, half gone. | smoke bomb clouds · sparkles |
| 111 | `move_icons` `move-toxin` | `art/icons/moves/toxin.png` | Toxin | Wick icon | in game now · placeholder · no slot yet | Operative rank II move (asked 13 Nov, C2) | A single drop falling from a vial onto a blade's edge. | a skull and crossbones · green goo |
| 112 | `move_icons` `move-sabotage` | `art/icons/moves/sabotage.png` | Sabotage | Wick icon | in game now · placeholder · no slot yet | Operative rank II move (asked 13 Nov, C2) | A cut cable hanging out of a machine panel, the two ends apart. | an explosion · a robot face |
| 113 | `move_icons` `move-execution` | `art/icons/moves/execution.png` | Execution | Wick icon | in game now · placeholder · no slot yet | Operative rank III move (asked 13 Nov, C2) | A reversed blade held point down over a nearly spent ring. | a guillotine · blood |
| 114 | `move_icons` `move-called-shot` | `art/icons/moves/called-shot.png` | Called Shot | Wick icon | in game now · placeholder · no slot yet | Operative rank III move (asked 13 Nov, C2) | A small ring drawn round one limb of a silhouette, a sight-line to it. | a crosshair over a head · text |
| 115 | `door_emblems` `door-shadow` | `art/emblems/doors/shadow.png` | Shadow wisp (door emblem) | door emblem | designed, not built | The door's mark: today the wisps are SVG | Three thin curved wisps fanned like smoke, the middle one longest. | a ghost · a flame (that is Wick) |
| 116 | `class_portraits` `class-infiltrator` | `art/portraits/classes/infiltrator.png` | The Operative (class portrait) | class portrait | designed, not built | Class card portrait | A quiet figure in a dark coat in a doorway's shadow, one gloved hand on a lockpick roll, eyes on the viewer, unreadable. | a spy from a known work · a mask covering the face |
| 117 | `move_icons` `move-parting-cut` | `art/icons/moves/parting-cut.png` | Parting Cut | Wick icon | designed, not built | Shadow 2.0 pending (`shadow.json pending`) | A last slash as Wick turns away into shadow, the blade line trailing. | blood · a cape |
| 118 | `move_icons` `move-case` | `art/icons/moves/case.png` | Case | Wick icon | designed, not built | Shadow 2.0 pending: read a foe's kit | Wick peering at a silhouette, small outlines of its weapon and pack shown beside it. | an X-ray skeleton · a briefcase |
| 119 | `move_icons` `move-shade-step` | `art/icons/moves/shade-step.png` | Shade Step | Wick icon | designed, not built | Shadow 2.0 next slice | Wick stepping into his own shadow on one side and out on the other. | a portal · sparkles |
| 120 | `move_icons` `move-way-ghost` | `art/icons/moves/way-ghost.png` | Ghost (Way) | Wick icon | designed, not built | Shadow 2.0 Way | Wick half faded, legs trailing as smoke. | a bedsheet ghost · a skull |
| 121 | `move_icons` `move-way-knife` | `art/icons/moves/way-knife.png` | Knife (Way) | Wick icon | designed, not built | Shadow 2.0 Way | Wick holding a small blade behind his back, smiling face hidden. | blood · a kitchen knife |
| 122 | `move_icons` `move-way-hand` | `art/icons/moves/way-hand.png` | Hand (Way) | Wick icon | designed, not built | Shadow 2.0 Way | Wick's hand in a stranger's coat pocket. | money symbols · a glove brand |

## Brain Power: Sigils, and the Sigilist

**Door:** Brain Power (its alpha skill opens it). **Class:** Sigilist (id `mage`). **Ink:** Intelligence `#8BDEEE`. The Sigils door slice (first-turn tab, door line, lean and recoil, the charge / Flux chip). The forty Sigil words are drawn in code (`glyphs.ts`: the glyph is the art, nothing to paint). The Evoker and its four variants share the Evoker's pictures.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 123 | `perks` `hold-the-stroke` | `art/icons/perks/hold-the-stroke.png` | Second Clause | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Brain Power perk (old icon: Wick holding a stroke mid-air) | Wick drawing a second glyph in the air over a burning silhouette, his stylus hand mid-stroke. | a letter or rune that reads as writing · a wizard hat |
| 124 | `perks` `parallel-thought` | `art/icons/perks/parallel-thought.png` | Running Hand | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Brain Power perk (old icon: two Wicks thinking side by side) | A glyph trailing in a long ribbon from Wick's fast-moving hand as he strides. | two Wicks (the old Parallel Thought) · letters |
| 125 | `move_icons` `move-overclock-sigil` | `art/icons/moves/overclock-sigil.png` | Overclock (Brain Power step) | Wick icon | in game now · placeholder · no slot yet | Brain Power door step | Wick's gloved hand with three small spark ticks jumping from the knuckles, a glyph bright in the palm. | a computer chip · a clock |
| 126 | `move_icons` `move-twin-draw` | `art/icons/moves/twin-draw.png` | Twin Draw | Wick icon | in game now · placeholder · no slot yet | Brain Power door step: two glyphs in one action | Two identical abstract glyph marks drawn side by side from one sweep of Wick's hand. | letters · a mirror |
| 127 | `move_icons` `move-barrage` | `art/icons/moves/barrage.png` | Barrage | Wick icon | in game now · placeholder · no slot yet | Sigilist rank I move | Three small glyph-darts leaving a line of glyphs one after another. | missiles with fire trails · text |
| 128 | `move_icons` `move-core-change` | `art/icons/moves/core-change.png` | Core Change | Wick icon | in game now · placeholder · no slot yet | Sigilist rank I move: a cheaper core swap | A spent round core popping out of the back of a glove as a fresh one slides in. | a battery with a plus sign · a brand |
| 129 | `move_icons` `move-overcharge` | `art/icons/moves/overcharge.png` | Overcharge | Wick icon | in game now · placeholder · no slot yet | Sigilist rank II move | A glyph line swelling thicker at its end, cracks of light at the edge. | lightning bolts · an explosion |
| 130 | `move_icons` `move-bleed-the-flux` | `art/icons/moves/bleed-the-flux.png` | Bleed the Flux | Wick icon | in game now · placeholder · no slot yet | Sigilist rank II move: cheaper Vent | A glove venting three short curls from a valve at the wrist. | steam train · smoke clouds |
| 131 | `move_icons` `move-payload` | `art/icons/moves/payload.png` | Payload | Wick icon | in game now · placeholder · no slot yet | Sigilist rank III move | A heavy glyph falling like a weight onto a small ring on the ground. | a bomb · a real missile |
| 132 | `move_icons` `move-stored-spell` | `art/icons/moves/stored-spell.png` | Stored Spell | Wick icon | in game now · placeholder · no slot yet | Sigilist rank III move | A glyph sealed inside a small round core, held between two fingers. | a potion · a book |
| 133 | `door_emblems` `door-sigil` | `art/emblems/doors/sigil.png` | Sigil chip (door emblem) | door emblem | designed, not built | The door's mark: today a chip of text | A short straight Line of three abstract glyph marks joined by one stroke, inside a thin square. | letters of any real script · the Sigil boon line icon (three marks, no square) |
| 134 | `class_portraits` `class-mage` | `art/portraits/classes/mage.png` | The Sigilist (class portrait) | class portrait | designed, not built | Class card portrait | A thin, precise caster in a work coat with an Evoker glove raised, a line of light-glyphs drawn on the floor behind, face calm and counting. | a wizard robe and hat · any letters in the glyphs |

## Visualization: Figments, and the Rigger

**Door:** Visualization (its alpha skill opens it). **Class:** Rigger (id `trickster`). **Ink:** Expression `#5394AC`. Figments 2.0 slices 2-3: an order per form, Glimmer, the Snare, Hand, Ward, Husk and Sentinel, forks. The ten forms in the game have their portraits and line icons; the twelve order icons and twelve trait icons delivered 15 Nov are catalogued but **no screen draws them** (verbs and traits have no icon slot today). The Scrap Turret shows its line icon on a dark plate.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 135 | `perks` `mirage` | `art/icons/perks/mirage.png` | Many-Eyed Dream | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Visualization perk (old icon: Wick shimmering into a mirage) | Wick with eyes open on several small floating figment shapes round him, each a shape of flecks. | a heat-haze mirage (the old icon) · many eyeballs |
| 136 | `perks` `blueprint` | `art/icons/perks/blueprint.png` | Wake of the Kill | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Visualization perk (old icon: a blueprint sheet) | A figment beast of flecks at Wick's side over a fallen foe, Wick leaning forward behind it. | a blueprint (the old icon) · blood |
| 137 | `figment_icons` `figment-glimmer` | `art/icons/figments/figment-glimmer.svg` | Glimmer | monoline icon | in game now · placeholder | Figments: the false Figment (`figments.json items glimmer`, icon empty today) | A small standing figure drawn only as an outline of dots and short dashes, no body inside it. | a ghost sheet · a full solid figure |
| 138 | `move_icons` `move-eye-and-wall` | `art/icons/moves/eye-and-wall.png` | Eye and Wall (fork) | Wick icon | in game now · placeholder · no slot yet | Visualization 3 fork choice | A lens shape and a short wall block side by side, a small fork line joining them below. | an eyeball · bricks with text |
| 139 | `move_icons` `move-beast-and-blade` | `art/icons/moves/beast-and-blade.png` | Beast and Blade (fork) | Wick icon | in game now · placeholder · no slot yet | Visualization 5 fork choice | A beast's head silhouette and a blade side by side, a fork line joining them below. | a real animal species badge · a sword from a known work |
| 140 | `figment_order_icons` `order-strike` | `art/icons/figments/order-strike.png` | Strike | Wick icon | in game now · placeholder · no slot yet | Figment order (`figment_strike`) | A figment shape of flecks lunging forward, one edge sharpened. | a solid creature · a person |
| 141 | `figment_order_icons` `order-pounce` | `art/icons/figments/order-pounce.png` | Pounce | Wick icon | in game now · placeholder · no slot yet | Figment order (`figment_pounce`, the Beast) | A beast of flecks mid-leap, front paws forward. | a real cat or dog breed · teeth with blood |
| 142 | `figment_order_icons` `order-cut` | `art/icons/figments/order-cut.png` | Cut | Wick icon | in game now · placeholder · no slot yet | Figment order (`figment_cut`, the Blade) | A floating blade of flecks drawing one long cut line. | a kitchen knife · blood |
| 143 | `figment_order_icons` `order-stare` | `art/icons/figments/order-stare.png` | Stare | Wick icon | in game now · placeholder · no slot yet | Figment order (`figment_stare`, the Eye) | A lens of flecks with three straight sight lines leaving it. | an eyeball · a camera brand |
| 144 | `figment_order_icons` `order-filch` | `art/icons/figments/order-filch.png` | Filch | Wick icon | in game now · placeholder · no slot yet | Figment order (`figment_filch`, the Hand) | A hand of flecks lifting a grenade off a foe's belt. | a real grenade model · a thief's mask |
| 145 | `figment_order_icons` `order-cash-in` | `art/icons/figments/order-cash-in.png` | Cash in | Wick icon | in game now · placeholder · no slot yet | Figment order (`figment_cash_in`) | A figment folding back into a small glowing core, flecks streaming inward. | coins or money · an explosion |
| 146 | `figment_order_icons` `order-let-go` | `art/icons/figments/order-let-go.png` | Let go | Wick icon | in game now · placeholder · no slot yet | Figment verb (`let_go`) | A shape coming apart into drifting flecks, open hand below it. | a balloon · smoke |
| 147 | `figment_trait_icons` `trait-armoured` | `art/icons/figments/trait-armoured.png` | Armoured | Wick icon | in game now · placeholder · no slot yet | Figment trait (in data; asked 13 Nov, C4) | A figment shape with three overlapping plate arcs on its front. | a knight helmet · a real armour model |
| 148 | `figment_trait_icons` `trait-swift` | `art/icons/figments/trait-swift.png` | Swift | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape trailing three long speed lines. | a running shoe · wings |
| 149 | `figment_trait_icons` `trait-loud` | `art/icons/figments/trait-loud.png` | Loud | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape with three sound arcs leaving it. | a loudspeaker · music notes |
| 150 | `figment_trait_icons` `trait-volatile` | `art/icons/figments/trait-volatile.png` | Volatile | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape with cracks of light breaking out of it. | a bomb with a fuse · fire |
| 151 | `figment_trait_icons` `trait-tethered` | `art/icons/figments/trait-tethered.png` | Tethered | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape tied by one thin line to a small ring on the ground. | a dog leash · chains |
| 152 | `figment_trait_icons` `trait-mirror` | `art/icons/figments/trait-mirror.png` | Mirror | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape and its reversed copy facing it across a thin line. | a hand mirror · a person |
| 153 | `figment_trait_icons` `trait-barbed` | `art/icons/figments/trait-barbed.png` | Barbed | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape with a row of short barbs along its edge. | barbed wire · blood |
| 154 | `figment_trait_icons` `trait-lasting` | `art/icons/figments/trait-lasting.png` | Lasting | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape standing on a long horizontal line that runs off both edges. | an hourglass · a clock |
| 155 | `figment_trait_icons` `trait-keen` | `art/icons/figments/trait-keen.png` | Keen | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment shape with one very sharp point and a small sparkle at it. | a knife · an eye |
| 156 | `figment_trait_icons` `trait-hollow` | `art/icons/figments/trait-hollow.png` | Hollow | Wick icon | in game now · placeholder · no slot yet | Figment trait | A figment outline with an empty centre, flecks only round the edge. | a ghost · a donut |
| 157 | `move_icons` `move-riggers-hands` | `art/icons/moves/riggers-hands.png` | The Rigger's Hands | Wick icon | in game now · placeholder · no slot yet | Rigger gain | Two hands holding a wrench and a Visualizer glove crossed. | a real tool brand · a spark of lightning |
| 158 | `move_icons` `move-double` | `art/icons/moves/double.png` | Double | Wick icon | in game now · placeholder · no slot yet | Rigger rank I move (`false_image`) | Wick and a dotted outline copy of him standing side by side. | two solid Wicks · a mirror frame |
| 159 | `move_icons` `move-field-fix` | `art/icons/moves/field-fix.png` | Field Fix | Wick icon | in game now · placeholder · no slot yet | Rigger rank I move (from the Infiltrator) | A hand with a wrench tightening one bolt on a small machine plate. | a car · a real tool brand |
| 160 | `move_icons` `move-salvage` | `art/icons/moves/salvage.png` | Salvage | Wick icon | in game now · placeholder · no slot yet | Rigger rank II move (asked 13 Nov, C4) | A small round core pulled from a wrecked drone's shell. | a junkyard · recycling symbol |
| 161 | `move_icons` `move-overclock` | `art/icons/moves/overclock.png` | Overclock | Wick icon | in game now · placeholder · no slot yet | Rigger rank II move (asked 13 Nov, C4) | A dial on a machine cranked past its last tick, the needle bent. | a speedometer of a real car · flames |
| 162 | `move_icons` `move-sleight` | `art/icons/moves/sleight.png` | Sleight | Wick icon | in game now · placeholder · no slot yet | Rigger rank III move: swap places | Wick and a figment swapping places, two curved arrows crossing between them. | a magician · playing cards |
| 163 | `move_icons` `move-scrap-turret` | `art/icons/moves/scrap-turret.png` | Scrap Turret | Wick icon | in game now · placeholder · no slot yet | Rigger rank III move (asked 13 Nov, C4) | A junk-built turret on three uneven legs, a pipe barrel. | a real gun turret · a robot face |
| 164 | `figments` `figment-scrap-turret` | `art/portraits/figments/figment-scrap-turret.png` | Scrap Turret (portrait) | Figment portrait | in game now (on its own stand-in) | The turret's token shows its line icon on a dark plate (own stand-in); the portrait was asked 13 Nov | Abstract portrait mode: an angular welded turret of scrap plates and a pipe barrel, NOT bot-flecks, cream welds on black, Expression blue in the shadows. | bot flecks (the turret is welded junk, not a Figment) · a real weapon make |
| 165 | `door_emblems` `door-figment` | `art/emblems/doors/figment.png` | Figment (door emblem) | door emblem | designed, not built | The door's mark | A small frame with a shape forming inside it out of scattered dots. | a picture frame with a photo · the Figments boon line icon (keep the frame square, not a portrait frame) |
| 166 | `class_portraits` `class-trickster` | `art/portraits/classes/trickster.png` | The Rigger (class portrait) | class portrait | designed, not built | Class card portrait | A quick-handed tinkerer with a Visualizer glove, a figment of flecks forming over the glove, a wrench through the belt, a crooked grin. | a stage magician · a known inventor character |
| 167 | `figment_icons` `figment-glass` | `art/icons/figments/figment-glass.svg` | Glass | monoline icon | designed, not built | Figments 2.0 form, waits for its build (portrait delivered 15 Nov) | Monoline: a tall pane shape with one diagonal crack line and three dots at its edge. | a window with a frame · shards |
| 168 | `figment_icons` `figment-ferry` | `art/icons/figments/figment-ferry.svg` | Ferry | monoline icon | designed, not built | Figments 2.0 form | Monoline: a low flat shape carrying a small circle across a wavy line. | a real boat · water texture |
| 169 | `figment_icons` `figment-breaker` | `art/icons/figments/figment-breaker.svg` | Breaker | monoline icon | designed, not built | Figments 2.0 form | Monoline: a heavy block with a fist-like front and two crack lines. | a hammer · the Breaker class emblem |
| 170 | `figment_icons` `figment-hush` | `art/icons/figments/figment-hush.svg` | Hush | monoline icon | designed, not built | Figments 2.0 form | Monoline: a small hooded shape with a finger line across where a mouth would be. | a face · a ghost |

## Empathy: Bonds and Tending, and the Mender

**Door:** Empathy (its alpha skill opens it). **Class:** Mender (id `bard`). **Ink:** Insight `#EB95B7`. Bonds 2.0 slice 1 (`2026-11-bonds-2.0.md`): Tug and Snap; the thread on the map is SVG (`fx/bonds.ts`, and the hotfix line's Bond effects). The Tend verbs (`data/tending.json`) have no icon; sixteen were asked 13 Nov (C3, C3b) and never delivered. The hotfix line adds Syphon through the Attuner (a verb, no icon).

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 171 | `perks` `shared-breath` | `art/icons/perks/shared-breath.png` | Taut Thread | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Empathy perk (old icon: two figures sharing a breath) | A taut thread from Wick's chest to an enemy, a blow landing on the thread's middle. | two figures kissing or breathing together (the old icon) · a rope |
| 172 | `perks` `lay-down-arms` | `art/icons/perks/lay-down-arms.png` | Bitter Balm | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Empathy perk (old icon: a figure laying down a weapon) | Wick healing his own hand with a soft glow while a thread carries a small wound mark to an enemy. | weapons on the ground (the old icon) · a red cross |
| 173 | `move_icons` `move-feel-their-pain` | `art/icons/moves/feel-their-pain.png` | Feel Their Pain | Wick icon | in game now · placeholder · no slot yet | Empathy door step | Wick with a hand on his own chest, a thread to a partial figure clutching the same spot. | blood · a broken heart cartoon |
| 174 | `move_icons` `move-mercy` | `art/icons/moves/mercy.png` | Mercy (thread kind) | Wick icon | in game now · placeholder · no slot yet | Empathy door: the ally thread | A slack thread with a heart-shaped knot running to a partial open hand. | a red heart emoji · a rope |
| 175 | `tending_icons` `tend-bond` | `art/icons/tending/bond.png` | Bond | Wick icon | in game now · placeholder · no slot yet | Tend verb (`tend.bond`, also `tend.bond_free`) | A slack thread with a heart knot from Wick's hand to a partial hand. | a wedding ring · a chain |
| 176 | `tending_icons` `tend-let-go` | `art/icons/tending/let-go.png` | Let Go | Wick icon | in game now · placeholder · no slot yet | Tend verb | A thread slipping off an open hand, its end curling away. | a balloon · a broken heart |
| 177 | `tending_icons` `tend-snap` | `art/icons/tending/snap.png` | Snap | Wick icon | in game now · placeholder · no slot yet | Tend verb, Bonds 2.0 (asked 15 Nov, C3b) | A thread parting in the middle between two hands, the two ends recoiling, a small burst at the break. | a rubber band · an explosion |
| 178 | `tending_icons` `tend-tug` | `art/icons/tending/tug.png` | Tug | Wick icon | in game now · placeholder · no slot yet | Tend verb, Bonds 2.0 (asked 15 Nov, C3b) | Wick hauling hand over hand on a thread that runs out of frame, leaning back. | tug of war with a team · a rope's real fibre texture |
| 179 | `tending_icons` `tend-mend` | `art/icons/tending/mend.png` | Mend | Wick icon | in game now · placeholder · no slot yet | Tend verb | Two hands closing a small gap in a partial figure's arm with a soft seam line. | a red cross · stitches with blood |
| 180 | `tending_icons` `tend-mend-self` | `art/icons/tending/mend-self.png` | Mend Yourself | Wick icon | in game now · placeholder · no slot yet | Tend verb | Wick's hand pressed to his own side, a soft ring round it. | a bandage brand · a red cross |
| 181 | `tending_icons` `tend-touch` | `art/icons/tending/touch.png` | Touch | Wick icon | in game now · placeholder · no slot yet | Tend verb | Two fingertips meeting, a small ring where they touch. | a creation-painting pose from any known work · a handshake |
| 182 | `tending_icons` `tend-settle` | `art/icons/tending/settle.png` | Settle | Wick icon | in game now · placeholder · no slot yet | Tend verb (Help) | A hand resting on a trembling partial shoulder, the shake lines going still. | a sleeping figure · a bed |
| 183 | `tending_icons` `tend-soothe` | `art/icons/tending/soothe.png` | Soothe | Wick icon | in game now · placeholder · no slot yet | Tend verb (Help) | A hand drawing a slow curve over a partial head, three small calm lines. | a halo · music notes |
| 184 | `tending_icons` `tend-shield` | `art/icons/tending/shield.png` | Shield (Tend) | Wick icon | in game now · placeholder · no slot yet | Tend verb | A thin bubble arc thrown over a partial figure from Wick's open palm. | a heater shield (that is Guard) · a dome |
| 185 | `tending_icons` `tend-raise` | `art/icons/tending/raise.png` | Raise | Wick icon | in game now · placeholder · no slot yet | Tend verb | Wick's hand lifting a fallen partial figure by the wrist, a thread between them. | a cross · angel wings |
| 186 | `tending_icons` `tend-guide` | `art/icons/tending/guide.png` | Guide | Wick icon | in game now · placeholder · no slot yet | Tend verb (picks the tile since the hotfix) | Wick's hand on a partial figure's back, pointing it toward a marked tile. | a road sign · a compass |
| 187 | `tending_icons` `tend-field-surgery` | `art/icons/tending/field-surgery.png` | Field Surgery | Wick icon | in game now · placeholder · no slot yet | Tend verb | A small blade and a needle crossed over a plus mark. | a red cross · blood |
| 188 | `tending_icons` `tend-last-thread` | `art/icons/tending/last-thread.png` | Last Thread | Wick icon | in game now · placeholder · no slot yet | Tend verb (asked 15 Nov, C3b) | A single thread still held by a hand reaching down to a fallen partial figure. | a grave · a halo |
| 189 | `tending_icons` `tend-syphon` | `art/icons/tending/syphon.png` | Syphon | Wick icon | in game now · placeholder · no slot yet | The Attuner's Syphon (the hotfix line, rules 1.55) | A thread drawing three small dots of light out of a dark ground into Wick's palm. | a vampire bite · a straw |
| 190 | `move_icons` `move-triage` | `art/icons/moves/triage.png` | Triage | Wick icon | in game now · placeholder · no slot yet | Mender rank I move (asked 13 Nov, C3) | Three short bars of different lengths, a hand pointing at the shortest. | a red cross · a hospital sign |
| 191 | `move_icons` `move-the-ledger` | `art/icons/moves/the-ledger.png` | The Ledger | Wick icon | in game now · placeholder · no slot yet | Mender rank I move (asked 13 Nov, C3) | An open ledger book with a thread for a bookmark, tally marks on the page. | readable text or numbers · coins |
| 192 | `move_icons` `move-inspire` | `art/icons/moves/inspire.png` | Inspire | Wick icon | in game now · placeholder · no slot yet | Mender rank II move (asked 13 Nov, C3) | Wick with a hand raised, a ribbon with a heart knot rising from it. | music notes · a megaphone |
| 193 | `move_icons` `move-take-the-weight` | `art/icons/moves/take-the-weight.png` | Take the Weight | Wick icon | in game now · placeholder · no slot yet | Mender rank II move (asked 13 Nov, C3) | Wick taking a heavy block off a partial figure's shoulders onto his own. | a barbell · a coffin |
| 194 | `move_icons` `move-brimming` | `art/icons/moves/brimming.png` | Brimming | Wick icon | in game now · placeholder · no slot yet | Mender rank III move (asked 13 Nov, C3) | A cupped pair of hands with light overflowing the rim. | a cup or goblet · water |
| 195 | `move_icons` `move-rally` | `art/icons/moves/rally.png` | Rally (Mender) | Wick icon | in game now · placeholder · no slot yet | Mender rank III move (asked 13 Nov, C3) | Wick with an arm raised, three threads fanning out from his chest to partial figures. | a flag · the Rally Call's icon pose (a shout) |
| 196 | `door_emblems` `door-bond` | `art/emblems/doors/bond.png` | Bond thread (door emblem) | door emblem | designed, not built | The door's mark | Two open rings linked by one thread with a heart knot at its middle. | chain links (the Bonds boon line) · a wedding ring |
| 197 | `class_portraits` `class-bard` | `art/portraits/classes/bard.png` | The Mender (class portrait) | class portrait | designed, not built | Class card portrait | A tired, kind field medic with an Attuner glove, fine threads of light from its fingertips to people off frame, sleeves rolled, steady eyes. | a red cross · a nurse uniform from any real service |
| 198 | `tending_icons` `tend-draw-taut` | `art/icons/tending/draw-taut.png` | Draw Taut | Wick icon | designed, not built | Bonds 2.0 next slice | A thread pulled straight and thick between two hands. | a bow string · a rope |
| 199 | `tending_icons` `tend-take-it-on` | `art/icons/tending/take-it-on.png` | Take It On | Wick icon | designed, not built | Bonds 2.0 next slice | A thread carrying a small wound mark from a partial figure into Wick's chest. | blood · a broken heart |
| 200 | `tending_icons` `tend-pass-it-on` | `art/icons/tending/pass-it-on.png` | Pass It On | Wick icon | designed, not built | Bonds 2.0 next slice | A thread passing a small light from one partial figure to another through Wick. | a relay baton · fire |
| 201 | `tending_icons` `tend-forewarn` | `art/icons/tending/forewarn.png` | Forewarn | Wick icon | designed, not built | Bonds 2.0 next slice | A thread twitching with a small zig-zag, a partial figure turning its head. | a siren · lightning |
| 202 | `tending_icons` `tend-knot` | `art/icons/tending/knot.png` | Knot | Wick icon | designed, not built | Bonds 2.0 next slice | Two enemy silhouettes joined by one curved thread knotted in the middle. | a rope knot diagram · chains |
| 203 | `tending_icons` `tend-steal-the-mending` | `art/icons/tending/steal-the-mending.png` | Steal the Mending | Wick icon | designed, not built | Bonds 2.0 next slice | A thread drawing a soft glow away from an enemy into Wick's hand. | a thief mask · a vampire |
| 204 | `tending_icons` `tend-pass-the-thread` | `art/icons/tending/pass-the-thread.png` | Pass the Thread | Wick icon | designed, not built | Bonds 2.0 next slice | Wick handing the end of a thread to a partial hand. | a needle and thread · a baton |
| 205 | `tending_icons` `tend-weavers-hands` | `art/icons/tending/weavers-hands.png` | Weaver's Hands | Wick icon | designed, not built | Bonds 2.0 next slice | Two hands with many fine threads running between the fingers like a cradle. | a loom · a spider web |
| 206 | `tending_icons` `tend-kind-spite` | `art/icons/tending/kind-spite.png` | Spite (thread kind) | Wick icon | designed, not built | Bonds 2.0 thread kind | A barbed thread with small ticks along it. | barbed wire · blood |
| 207 | `tending_icons` `tend-kind-leash` | `art/icons/tending/kind-leash.png` | Leash (thread kind) | Wick icon | designed, not built | Bonds 2.0 thread kind | A double thread, two lines close together, ending in a loop. | a dog collar · chains |

## Will Power: the Outburst, and the Channeler

**Door:** Will Power (its alpha skill opens it). **Class:** Channeler (id `channeler`). **Ink:** Determination `#9D7ADC`. The Outbursts door slice (the tab survives the turn banner; the turn card's Outburst lines). The 25 feelings and 38 modules have their delivered icons; only the perks and the Channeler's moves lack art.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 208 | `perks` `heart-overload` | `art/icons/perks/heart-overload.png` | Clenched Heart | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Will Power perk (old icon: Heart Overload, HP paid for a Begin) | A fist clenched over a blazing heart held at full height above Wick's head. | a heart torn open (the old icon) · blood |
| 209 | `perks` `resonance` | `art/icons/perks/resonance.png` | Resonance | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Will Power perk (numbers changed in 1.56; the old icon drew rules 1.14's allies' Releases) | Wick releasing a heart-burst, two fainter rings of the same burst echoing behind it, each larger. | other figures casting (the old meaning) · a speaker |
| 210 | `move_icons` `move-overdraw` | `art/icons/moves/overdraw.png` | Overdraw | Wick icon | in game now · placeholder · no slot yet | Will Power door step | A heart pulled wider than its outline, the outline cracking at one side. | a bow (that is the archer) · blood |
| 211 | `move_icons` `move-pure-heart` | `art/icons/moves/pure-heart.png` | Pure Heart | Wick icon | in game now · placeholder · no slot yet | Will Power door step | A heart with a perfectly clean outline and one small star at its centre. | a red heart emoji · a halo |
| 212 | `move_icons` `move-shape` | `art/icons/moves/shape.png` | Shape | Wick icon | in game now · placeholder · no slot yet | Channeler rank I move | Two hands shaping a heart-burst into a long lance between them. | a potter's wheel · clay |
| 213 | `move_icons` `move-iron-heart` | `art/icons/moves/iron-heart.png` | Iron Heart | Wick icon | in game now · placeholder · no slot yet | Channeler rank I move: a higher Strain limit | A heart with two riveted bands round it. | a padlock · a metal robot heart |
| 214 | `move_icons` `move-storm-front` | `art/icons/moves/storm-front.png` | Storm Front | Wick icon | in game now · placeholder · no slot yet | Channeler rank II move | A wall of three rolling arcs advancing from Wick's spread hands. | weather icons · a cloud with rain |
| 215 | `move_icons` `move-occult-library` | `art/icons/moves/occult-library.png` | Occult Library | Wick icon | in game now · placeholder · no slot yet | Channeler rank II move | A small shelf of three bound books, a heart mark on the middle spine. | readable titles · a skull |
| 216 | `move_icons` `move-heart-surge` | `art/icons/moves/heart-surge.png` | Heart Surge | Wick icon | in game now · placeholder · no slot yet | Channeler rank III move | A heart with a sharp spike rising out of its top like a pulse line. | an ECG of a real monitor · blood |
| 217 | `move_icons` `move-eye-of-the-storm` | `art/icons/moves/eye-of-the-storm.png` | Eye of the Storm | Wick icon | in game now · placeholder · no slot yet | Channeler rank III move | Wick standing still at the calm centre of a spiral of arcs. | a hurricane satellite view · an eyeball |
| 218 | `door_emblems` `door-outburst` | `art/emblems/doors/outburst.png` | Outburst heart (door emblem) | door emblem | designed, not built | The door's mark | A heart with one swelling ring round it and a single spark at its top. | the Outburst boon line icon (four rings) · a red heart emoji |
| 219 | `class_portraits` `class-channeler` | `art/portraits/classes/channeler.png` | The Channeler (class portrait) | class portrait | designed, not built | Class card portrait | A caster in a long coat with an Emanator glove, a storm-violet heart-burst swelling between their hands, hair lifting, jaw set. | a superhero pose · lightning from the eyes |

## Faith: prayer, and the Chaplain

**Door:** Faith (its alpha skill opens it). **Class:** Chaplain (id `guardian`). **Ink:** Virtue `#D36A90`. Prayer 2.0 (`2026-11-prayer-2.0.md`): the Canticle (a song held over turns, with verses that land as states on allies), Amen, Holy Dread, Last Rites. The 39 prayer icons exist; the Chaplain's own verbs and the Canticle's eleven verses have none. The Judged and Witnessed eyes and the Ward hex are SVG.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 220 | `perks` `litany` | `art/icons/perks/litany.png` | Unbroken Litany | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Faith perk (old icon: Wick reciting a litany from a book) | Wick's lips moving in prayer, a hymn-ray already rising from his open hand. | a book of scripture (the old icon) · any real religious symbol |
| 221 | `perks` `holy-ordnance` | `art/icons/perks/holy-ordnance.png` | Sinner's Due | Wick icon | in game now (shows the OLD perk's icon) · placeholder | Faith perk (old icon: a blessed shell) | A beam from above striking a kneeling, broken partial figure. | an artillery shell (the old icon) · a real religion's cross |
| 222 | `move_icons` `move-answered-prayer` | `art/icons/moves/answered-prayer.png` | Answered Prayer | Wick icon | in game now · placeholder · no slot yet | Faith door step | Two cupped hands with a single ray coming down into them. | a real religious symbol · a sun face |
| 223 | `move_icons` `move-deliver-the-sinner` | `art/icons/moves/deliver-the-sinner.png` | Deliver the Sinner | Wick icon | in game now · placeholder · no slot yet | Faith door step | A hand pointing down at a kneeling partial figure, a ray from above on it. | chains · fire and brimstone |
| 224 | `move_icons` `move-at-your-side` | `art/icons/moves/at-your-side.png` | The Patron at Your Side | Wick icon | in game now · placeholder · no slot yet | Chaplain gain | Wick with a tall faint outline of a figure standing behind him, a hand on his shoulder. | a recognisable god from any real religion · wings |
| 225 | `move_icons` `move-canticle` | `art/icons/moves/canticle.png` | Canticle | Wick icon | in game now · placeholder · no slot yet | Chaplain gain: the song held over turns | Wick with his head tilted back, mouth open, one hand on his chest, three rising arcs. | music notes · a microphone |
| 226 | `move_icons` `move-amen` | `art/icons/moves/amen.png` | Amen | Wick icon | in game now · placeholder · no slot yet | Chaplain gain | Wick with one finger raised toward a second, smaller figure's swing. | praying hands from a real tradition · a halo |
| 227 | `move_icons` `move-holy-dread` | `art/icons/moves/holy-dread.png` | Holy Dread | Wick icon | in game now · placeholder · no slot yet | Chaplain gain | Wick pointing, a cowering partial shape before him. | horror faces · a skull |
| 228 | `move_icons` `move-last-rites` | `art/icons/moves/last-rites.png` | Last Rites | Wick icon | in game now · placeholder · no slot yet | Chaplain gain | Wick kneeling, a hand on a lying figure. | a coffin · a real religious symbol |
| 229 | `prayers` `whisper-ward` | `art/icons/prayers/whisper-ward.png` | Ward | Wick icon | in game now · placeholder · no slot yet | Chaplain rank I move, a Whisper only the Chaplain says (asked 13 Nov, C1) | Wick whispering into his cupped hand, a thin hex-shaped ward forming round a partial ally. | a heater shield · the Protection Whisper's arc |
| 230 | `move_icons` `move-smite` | `art/icons/moves/smite.png` | Smite | Wick icon | in game now · placeholder · no slot yet | Chaplain rank I move (asked 13 Nov, C1) | A weapon hit that carries a single ray coming down from above into the struck point. | a real religious symbol · lightning bolt |
| 231 | `move_icons` `move-under-the-eye` | `art/icons/moves/under-the-eye.png` | Under the Eye | Wick icon | in game now · placeholder · no slot yet | Chaplain rank II move (from the Lumeri Templar) | A partial ally under a large open eye drawn as an arc above. | a real religious all-seeing-eye symbol · a pyramid |
| 232 | `move_icons` `move-blessed-arms` | `art/icons/moves/blessed-arms.png` | Blessed Arms | Wick icon | in game now · placeholder · no slot yet | Chaplain rank II move (from the Lumeri Templar) | A blade and a shell crossed under a single short ray. | a real religion's cross · fire |
| 233 | `prayers` `hymn-sanctuary` | `art/icons/prayers/hymn-sanctuary.png` | Sanctuary | Wick icon | in game now · placeholder · no slot yet | Chaplain rank III move, a Hymn (asked 13 Nov, C1) | Wick singing, a square patch of ground under him lit by a soft outline. | a church building · a dome |
| 234 | `move_icons` `move-verdict` | `art/icons/moves/verdict.png` | Verdict | Wick icon | in game now · placeholder · no slot yet | Chaplain rank III move, was Judgement (asked 13 Nov, C1) | One decided downward blow after a pointed finger. | a gavel · scales of justice |
| 235 | `condition_icons` `cond-canticle-nerukhan` | `art/icons/conditions/canticle-nerukhan.png` | Shelter of the Saints (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse state for Nerukhan | An arch of small halos over a partial head. | a real saint · a church |
| 236 | `condition_icons` `cond-canticle-the-quartermaster` | `art/icons/conditions/canticle-the-quartermaster.png` | Short Supply (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for the Quartermaster | A small crate with one round left in it, a ray on it. | a real army crate stencil · text |
| 237 | `condition_icons` `cond-canticle-the-laughing-mask` | `art/icons/conditions/canticle-the-laughing-mask.png` | Missed Me (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for the Laughing Mask | A dart passing beside a grinning mask. | a theatre-mask logo · a clown |
| 238 | `condition_icons` `cond-canticle-toll-keeper` | `art/icons/conditions/canticle-toll-keeper.png` | Not Yet (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for the Toll-Keeper | A hand held up flat, stopping a falling coin. | a stop sign · a skull |
| 239 | `condition_icons` `cond-canticle-mother-ember` | `art/icons/conditions/canticle-mother-ember.png` | Warm Hands (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for Mother Ember | Two hands round a small ember. | fire texture · a red heart |
| 240 | `condition_icons` `cond-canticle-old-overcast` | `art/icons/conditions/canticle-old-overcast.png` | Gathering (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for Old Overcast | Three short arcs gathering above a partial head like a cloud. | a weather icon · lightning |
| 241 | `condition_icons` `cond-canticle-the-matchmaker` | `art/icons/conditions/canticle-the-matchmaker.png` | Hold My Hand (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for the Matchmaker | Two hands clasped, a small knot below them. | a wedding ring · a heart emoji |
| 242 | `condition_icons` `cond-canticle-counting-weaver` | `art/icons/conditions/canticle-counting-weaver.png` | Foreknown (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse for the Counting Weaver | A thread with three beads, the next bead lit. | an abacus with numbers · a crystal ball |
| 243 | `condition_icons` `cond-canticle-plain` | `art/icons/conditions/canticle-plain.png` | Stubborn (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle verse with no patron | A planted foot on a ground line, a short ray above. | a boot brand · a mule |
| 244 | `condition_icons` `cond-canticle-crescendo` | `art/icons/conditions/canticle-crescendo.png` | Crescendo (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle: the song's height | Three arcs rising, each larger, from a small mouth line. | music notes · a speaker |
| 245 | `condition_icons` `cond-canticle-rising` | `art/icons/conditions/canticle-rising.png` | Rising (verse) | white-ink sign | in game now · placeholder · no slot yet | Canticle: verse II felt | One arc rising from a ground line with a small upward tick. | a sunrise with a face · an arrow logo |
| 246 | `door_emblems` `door-prayer` | `art/emblems/doors/prayer.png` | Prayer mark (door emblem) | door emblem | designed, not built | The door's mark (the patron marks exist; this is the door's own) | Two cupped hands round a single short ray. | the Faith boon line (hands round a flame) · a real religion's symbol |
| 247 | `class_portraits` `class-guardian` | `art/portraits/classes/guardian.png` | The Chaplain (class portrait) | class portrait | designed, not built | Class card portrait | A worn chaplain in a road-dusty cassock-coat with prayer beads round one wrist and a short weapon in the other hand, singing mid-line, eyes up. | a real church's vestments or symbols · a halo |
| 248 | `move_icons` `move-hallow` | `art/icons/moves/hallow.png` | Hallow | Wick icon | designed, not built | Prayer 2.0 next slice | Wick pressing a palm to the ground, three lines rising. | a church · a cross |
| 249 | `move_icons` `move-confessor` | `art/icons/moves/confessor.png` | Confessor (Office) | Wick icon | designed, not built | Prayer 2.0 Office | Wick seated, hands folded. | a confessional booth · a real religious habit |
| 250 | `move_icons` `move-crusader` | `art/icons/moves/crusader.png` | Crusader (Office) | Wick icon | designed, not built | Prayer 2.0 Office | Wick with a raised weapon and a sun-mark behind it. | a real crusading cross · a real order's emblem |

## The monk's gloves (the Open Hand)

**Ink:** `#F68A38`. The glove family (rules 1.56, `2026-11-unarmed.md`): four gloves with monoline line icons drawn in-house and no painting; the Open Hand (`items.json open_hand`, a mod that holds the forms) with no art at all. The forms (Jab, Palm, Sweep, Snatch; Open guard, Sway, Counter, Breath) show as words on the glove card.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 251 | `gear` `mod-open_hand` | `art/icons/gear/mod-open_hand.png` | Open Hand | painted gear icon | in game now · placeholder | The Open Hand: the glove family's forms, a mod row in the pack and the ARMS tab (no art at all) | Painted gear icon: a single bare hand-wrap tied in an open palm shape, the trailing end loose, a small round knuckle plate stitched on the back. Neutral cloth and charcoal, Strength orange #F68A38 only in the stitching. | a fist (the knuckledusters are fists) · any real martial-arts school emblem |
| 252 | `gear` `weapon-hand_wraps` | `art/icons/gear/weapon-hand_wraps.png` | Hand wraps | painted gear icon | in game now (on its own stand-in) | Glove weapon (monoline icon in place; painting wanted) | A wrapped fist in grey cloth, the wrap's end trailing in a curl, knuckles slightly scuffed. | a boxing glove · a real brand |
| 253 | `gear` `weapon-striking_gloves` | `art/icons/gear/weapon-striking_gloves.png` | Striking gloves | painted gear icon | in game now (on its own stand-in) | Glove weapon (monoline icon; painting wanted) | A slim open fingerless glove in dark leather, two seam lines across the knuckles. | a boxing glove · a real brand |
| 254 | `gear` `weapon-iron_mitts` | `art/icons/gear/weapon-iron_mitts.png` | Iron mitts | painted gear icon | in game now (on its own stand-in) | Glove weapon (monoline icon; painting wanted) | A blocky foundry mitt with three plate lines, the fingers welded shut. | a robot hand · a gauntlet from any known work |
| 255 | `gear` `weapon-kemizuchi_strikers` | `art/icons/gear/weapon-kemizuchi_strikers.png` | Kemizuchi strikers | painted gear icon | in game now (on its own stand-in) | Glove weapon (monoline icon; painting wanted) | The slim glove with a short folded-steel point at the knuckle, the Kemizuchi signature: a fine wave line in the steel. | a katana · a real swordsmith's mark |
| 256 | `move_icons` `move-open-guard` | `art/icons/moves/open-guard.png` | Open guard | Wick icon | in game now · placeholder · no slot yet | The Open Hand's stance (a toggle) | Wick standing side-on, one palm raised flat in front. | a karate gi · a real martial-arts pose from a known film |
| 257 | `move_icons` `move-jab` | `art/icons/moves/jab.png` | Jab | Wick icon | in game now · placeholder · no slot yet | Open Hand form | Wick throwing a short straight punch, the shoulder turned. | a boxing glove · motion blur |
| 258 | `move_icons` `move-palm` | `art/icons/moves/palm.png` | Palm | Wick icon | in game now · placeholder · no slot yet | Open Hand form | Wick's two-hand push, a small partial figure tipping away. | the Shove move's single figure push (make it two flat palms forward) · a wall |
| 259 | `move_icons` `move-sweep-form` | `art/icons/moves/sweep-form.png` | Sweep (form) | Wick icon | in game now · placeholder · no slot yet | Open Hand form (not the technique Sweep) | Wick low, one leg arcing along the floor, a curved line tracing it. | a broom · a blade's sweep (that is the technique) |
| 260 | `move_icons` `move-snatch` | `art/icons/moves/snatch.png` | Snatch | Wick icon | in game now · placeholder · no slot yet | Open Hand form | Wick's hand closing on a falling blade's grip in mid-air. | a thief · blood |
| 261 | `move_icons` `move-breath` | `art/icons/moves/breath.png` | Breath | Wick icon | in game now · placeholder · no slot yet | Open Hand: the breath that steadies | Wick still, eyes closed, a ring round him. | the Still Breath step of Ingenuity (no wisp here: a ring) · smoke |
| 262 | `move_icons` `move-sway` | `art/icons/moves/sway.png` | Sway | Wick icon | in game now · placeholder · no slot yet | Open Hand slice 2 | Wick leaning out of a straight line, the line bending past him. | a boxer's bob with gloves · a dancer |
| 263 | `move_icons` `move-counter` | `art/icons/moves/counter.png` | Counter | Wick icon | in game now · placeholder · no slot yet | Open Hand slice 2 | Wick stepping back as a fist sails short, then snapping a strike, a small hook arrow. | two figures sparring · a cash counter |
| 264 | `move_icons` `move-closing-strike` | `art/icons/moves/closing-strike.png` | Closing Strike | Wick icon | designed, not built | Open Hand next slice | Wick mid-lunge, three ticks gathered at the fist. | a boxing glove · lightning |
| 265 | `move_icons` `move-flow` | `art/icons/moves/flow.png` | Flow | Wick icon | designed, not built | Open Hand next slice | Three small ticks circling above Wick's head. | water · a yin-yang |
| 266 | `move_icons` `move-slip-unarmed` | `art/icons/moves/slip-unarmed.png` | Slip (unarmed) | Wick icon | designed, not built | Open Hand next slice | Wick leaning out of a line, the line bending past (the Slip of the unarmed draft). | Sway's exact pose (lean the other way, both hands up) |

## Survival and camp

**Ink:** `#A3AEC2`. Survival's art is nearly complete. What is left: two delivered pictures the game did not draw (wired in this change), one painting the build could not find (Contraband: fixed in this change), and the camp checklist of the hotfix line (rules 1.55 item 49), whose steps are words only.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 267 | `survival_art` `survival-card-title` | `(none)` | Survival lobby card | nothing to paint | wired in this change | The lobby's Survival card (`modes.json` `art_pending: true` until this change) | Delivered 14 Nov as `survival-p058` (`title-survival.png`); catalogued under its id in this change. | nothing to paint · nothing to paint |
| 268 | `survival_art` `rest-medic` | `(none)` | Mallow, the medic | nothing to paint | wired in this change | The rest's face (`survival.json` `portrait_pending: true` until this change) | Delivered 13 Nov as `survival-p038` (`rest-medic.png`); catalogued under its id in this change. | nothing to paint · nothing to paint |
| 269 | `survival_art` `loot-contraband` | `(none)` | Contraband | nothing to paint | wired in this change | The Contraband item (painted as `loot-contraband.png`, built as `gear-loot-contraband`, so the game found nothing) | The build now gives a `loot-<id>` painting whose id is an item that item's own key (`gear-contraband`). | nothing to paint · nothing to paint |
| 270 | `camp_icons` `camp-step-weapon` | `art/icons/survival/camp/step-weapon.png` | Step 1: Your free weapon | white-ink sign | designed, not built | The camp checklist's first step header (the hotfix line; words only, no slot) | A rifle and a sword crossed low, a small tick in a ring above them. | any real weapon make · text |
| 271 | `camp_icons` `camp-step-focus` | `art/icons/survival/camp/step-focus.png` | Step 2: Your free focus | white-ink sign | designed, not built | The camp checklist's focus step | A single glove with a small round core on its back, a tick in a ring above. | a real brand · a magic wand |
| 272 | `camp_icons` `camp-step-budget` | `art/icons/survival/camp/step-budget.png` | Step 3: Spend your budget | white-ink sign | designed, not built | The camp checklist's budget step | A small purse with three coins stacked beside it. | a currency symbol · text |
| 273 | `camp_icons` `camp-step-boon` | `art/icons/survival/camp/step-boon.png` | Step 4: Your starting boon | white-ink sign | designed, not built | The camp checklist's boon step | A small ribbon medal on a pin. | a real military medal · a star with text |
| 274 | `camp_icons` `camp-step-ready` | `art/icons/survival/camp/step-ready.png` | Ready | white-ink sign | designed, not built | The camp checklist's last step | A pack with its flap buckled and a tick above it. | a real brand · a checkmark alone (keep the pack) |

## Conditions and states

**Ink:** `#A3AEC2`. Conditions (`data/conditions.json`, 107 rows) show as **words** on the token, the hover card and the log; a few (the Judged and Witnessed eyes, the Shadow eye) are code-drawn SVG. **No condition has an icon and no screen has a slot for one.** The 50 feeling states (`given_*`, `foe_*`) draw their feeling's delivered glyph and the eleven Canticle verses are under Faith, so neither is repeated here: these are the other 50.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 275 | `condition_icons` `cond-bleeding` | `art/icons/conditions/bleeding.png` | Bleeding | white-ink sign | in game now · placeholder · no slot yet | Body condition | Three drops falling from a short cut line. | realistic blood · gore |
| 276 | `condition_icons` `cond-burning` | `art/icons/conditions/burning.png` | Burning | white-ink sign | in game now · placeholder · no slot yet | Body condition | A small stylised flame on a ground line with two rising flicks. | Wick's flame (keep it on the ground, low and wide) · smoke clouds |
| 277 | `condition_icons` `cond-weakened` | `art/icons/conditions/weakened.png` | Weakened | white-ink sign | in game now · placeholder · no slot yet | Body condition | An arm bent with a downward drooping arrow over it. | muscles · a broken bone |
| 278 | `condition_icons` `cond-slowed` | `art/icons/conditions/slowed.png` | Slowed | white-ink sign | in game now · placeholder · no slot yet | Body condition | A foot on a ground line with a small weight chained to the heel. | a snail · a clock |
| 279 | `condition_icons` `cond-silenced` | `art/icons/conditions/silenced.png` | Silenced | white-ink sign | in game now · placeholder · no slot yet | Brain condition | A mouth line crossed by a single short bar. | a real no-sign · tape with text |
| 280 | `condition_icons` `cond-nausea` | `art/icons/conditions/nausea.png` | Nausea | white-ink sign | in game now · placeholder · no slot yet | Body condition | A spiral over a small bowed head. | vomit · green colour |
| 281 | `condition_icons` `cond-pinned` | `art/icons/conditions/pinned.png` | Pinned | white-ink sign | in game now · placeholder · no slot yet | Body condition | A figure pressed low under three short bullet lines. | a pushpin · a map pin |
| 282 | `condition_icons` `cond-stunned` | `art/icons/conditions/stunned.png` | Stunned | white-ink sign | in game now · placeholder · no slot yet | Body condition | Three small stars circling a tilted head. | cartoon birds · a hammer |
| 283 | `condition_icons` `cond-dazed` | `art/icons/conditions/dazed.png` | Dazed | white-ink sign | in game now · placeholder · no slot yet | Body condition | A wavy line over a head with half-closed eyes. | stars (that is Stunned) · a spiral (that is Nausea) |
| 284 | `condition_icons` `cond-blinded` | `art/icons/conditions/blinded.png` | Blinded | white-ink sign | in game now · placeholder · no slot yet | Body condition | A closed eye with a single bar across it. | sunglasses · a blindfold with text |
| 285 | `condition_icons` `cond-prone` | `art/icons/conditions/prone.png` | Prone | white-ink sign | in game now · placeholder · no slot yet | Body condition | A figure lying flat on a ground line. | a bed · a coffin |
| 286 | `condition_icons` `cond-confused` | `art/icons/conditions/confused.png` | Confused | white-ink sign | in game now · placeholder · no slot yet | Brain condition | A small head with two arrows curving in opposite directions over it. | a question mark · a maze |
| 287 | `condition_icons` `cond-fear` | `art/icons/conditions/fear.png` | Fear | white-ink sign | in game now · placeholder · no slot yet | Heart condition | A small figure shrinking back with three shake lines. | a horror face · a skull |
| 288 | `condition_icons` `cond-shaken` | `art/icons/conditions/shaken.png` | Shaken | white-ink sign | in game now · placeholder · no slot yet | Heart condition | A small figure with two short shake lines either side. | sweat drops · an earthquake |
| 289 | `condition_icons` `cond-hidden` | `art/icons/conditions/hidden.png` | Hidden | white-ink sign | in game now · placeholder · no slot yet | State word HIDDEN | An eye half closed behind a low wall line. | a closed eye only · a box |
| 290 | `condition_icons` `cond-marked` | `art/icons/conditions/marked.png` | Marked | white-ink sign | in game now · placeholder · no slot yet | State word MARKED | A small diamond mark over a silhouette's shoulder. | a target ring · a map pin |
| 291 | `condition_icons` `cond-read` | `art/icons/conditions/read.png` | Read | white-ink sign | in game now · placeholder · no slot yet | State word READ | A silhouette with a small arrow above showing its next move. | a book · a crystal ball |
| 292 | `condition_icons` `cond-judged` | `art/icons/conditions/judged.png` | Judged | white-ink sign | in game now · placeholder · no slot yet | State word JUDGED (today a code eye) | An eye under a short downward ray. | a gavel · scales |
| 293 | `condition_icons` `cond-braced` | `art/icons/conditions/braced.png` | Braced | white-ink sign | in game now · placeholder · no slot yet | State word BRACED | Two crossed forearms over a wide stance line. | a shield · a wall |
| 294 | `condition_icons` `cond-overwatch` | `art/icons/conditions/overwatch.png` | Overwatch | white-ink sign | in game now · placeholder · no slot yet | State word OVERWATCH | An eye over a long flat sight-line. | a sniper scope glint · a tower |
| 295 | `condition_icons` `cond-witnessed` | `art/icons/conditions/witnessed.png` | Witnessed | white-ink sign | in game now · placeholder · no slot yet | State word WITNESSED (today a code eye) | An open eye with three short rays above. | a real religious eye · a pyramid |
| 296 | `condition_icons` `cond-downed` | `art/icons/conditions/downed.png` | Downed | white-ink sign | in game now · placeholder · no slot yet | State word DOWNED | A figure on one knee, one hand on the ground. | a skull · a grave |
| 297 | `condition_icons` `cond-grappled` | `art/icons/conditions/grappled.png` | Grappled | white-ink sign | in game now · placeholder · no slot yet | Body condition | Two arms locked round a small silhouette's waist. | a wrestling ring · a choke |
| 298 | `condition_icons` `cond-taunted` | `art/icons/conditions/taunted.png` | Taunted | white-ink sign | in game now · placeholder · no slot yet | Heart condition TAUNTED | A silhouette turned toward a small beckoning hand. | a middle finger · an angry face |
| 299 | `condition_icons` `cond-commanded` | `art/icons/conditions/commanded.png` | Commanded | white-ink sign | in game now · placeholder · no slot yet | Heart condition | A small figure under a pointing hand from above. | a puppet string (that is Puppeted) · a crown |
| 300 | `condition_icons` `cond-puppeted` | `art/icons/conditions/puppeted.png` | Puppeted | white-ink sign | in game now · placeholder · no slot yet | Brain condition | A small figure hung from two thin strings. | a real puppet character · a cross bar with text |
| 301 | `condition_icons` `cond-disarmed` | `art/icons/conditions/disarmed.png` | Disarmed | white-ink sign | in game now · placeholder · no slot yet | Heart condition | An open hand with a weapon falling from it. | blood · a broken weapon |
| 302 | `condition_icons` `cond-injured` | `art/icons/conditions/injured.png` | Injured | white-ink sign | in game now · placeholder · no slot yet | Body condition (a lasting injury) | A bandaged limb with a small crack line. | a red cross · blood |
| 303 | `condition_icons` `cond-suppressed` | `art/icons/conditions/suppressed.png` | Suppressed | white-ink sign | in game now · placeholder · no slot yet | Body condition SUPPRESSED | A head ducked below a line with bullet lines above it. | a helmet with insignia · a pinned figure flat (that is Pinned) |
| 304 | `condition_icons` `cond-corroded` | `art/icons/conditions/corroded.png` | Corroded | white-ink sign | in game now · placeholder · no slot yet | Body condition | A plate with pitted holes and a drip. | green goo · a skull |
| 305 | `condition_icons` `cond-off-balance` | `art/icons/conditions/off-balance.png` | Off Balance | white-ink sign | in game now · placeholder · no slot yet | Body condition OFF BALANCE | A figure on one foot, leaning, arms out. | a tightrope · a dancer |
| 306 | `condition_icons` `cond-guarded` | `art/icons/conditions/guarded.png` | Guarded | white-ink sign | in game now · placeholder · no slot yet | State word GUARDED | A small figure behind a plate-arc held by a larger arm. | a heater shield · a dome |
| 307 | `condition_icons` `cond-bonded` | `art/icons/conditions/bonded.png` | Bonded | white-ink sign | in game now · placeholder · no slot yet | Heart state BONDED | Two small figures joined by a thread with a heart knot. | a wedding ring · a chain |
| 308 | `condition_icons` `cond-traced` | `art/icons/conditions/traced.png` | Traced | white-ink sign | in game now · placeholder · no slot yet | State word TRACED | A dotted line following a silhouette's footprints. | a paw print · a map |
| 309 | `condition_icons` `cond-exposed` | `art/icons/conditions/exposed.png` | Exposed | white-ink sign | in game now · placeholder · no slot yet | State word EXPOSED | A silhouette with a cracked plate falling off its chest. | nudity · blood |
| 310 | `condition_icons` `cond-reeled` | `art/icons/conditions/reeled.png` | Reeled | white-ink sign | in game now · placeholder · no slot yet | Body condition REELED | A silhouette pulled along a curved thread toward a hand. | a fishing reel · a hook |
| 311 | `condition_icons` `cond-settled` | `art/icons/conditions/settled.png` | Settled | white-ink sign | in game now · placeholder · no slot yet | State word SETTLED | A small figure seated, three calm lines beside it. | a bed · a sleeping face |
| 312 | `condition_icons` `cond-watched` | `art/icons/conditions/watched.png` | Watched | white-ink sign | in game now · placeholder · no slot yet | State word WATCHED | A silhouette with an eye shape above it. | a camera · a real surveillance logo |
| 313 | `condition_icons` `cond-slipping` | `art/icons/conditions/slipping.png` | Slipping | white-ink sign | in game now · placeholder · no slot yet | State word (the free move after an attack) | A foot sliding on a short streak. | a banana peel · ice skates |
| 314 | `condition_icons` `cond-emplaced` | `art/icons/conditions/emplaced.png` | Emplaced | white-ink sign | in game now · placeholder · no slot yet | State word (a weapon set up) | A gun on a small tripod with its legs planted. | a real weapon make · a turret |
| 315 | `condition_icons` `cond-withdrawing` | `art/icons/conditions/withdrawing.png` | Withdrawing | white-ink sign | in game now · placeholder · no slot yet | State word | A figure stepping backwards with an arrow pointing back. | running away scared (that is Fear) · a door |
| 316 | `condition_icons` `cond-lowered` | `art/icons/conditions/lowered.png` | Weapon lowered | white-ink sign | in game now · placeholder · no slot yet | Heart state | A gun held pointing at the ground line. | a white flag · a broken gun |
| 317 | `condition_icons` `cond-quickened` | `art/icons/conditions/quickened.png` | Quickened | white-ink sign | in game now · placeholder · no slot yet | State word | A figure with three speed ticks behind. | a lightning bolt · wings |
| 318 | `condition_icons` `cond-sharpened` | `art/icons/conditions/sharpened.png` | Sharpened | white-ink sign | in game now · placeholder · no slot yet | State word | A blade edge with a small bright point. | a pencil · a whetstone brand |
| 319 | `condition_icons` `cond-inspired` | `art/icons/conditions/inspired.png` | Inspired | white-ink sign | in game now · placeholder · no slot yet | State word | A head with a small ray rising from it. | a light bulb · a halo |
| 320 | `condition_icons` `cond-hopeful` | `art/icons/conditions/hopeful.png` | Hopeful | white-ink sign | in game now · placeholder · no slot yet | State word | A small figure looking up at a single dot of light. | a sunrise with a face · a rainbow |
| 321 | `condition_icons` `cond-scorned` | `art/icons/conditions/scorned.png` | Scorned | white-ink sign | in game now · placeholder · no slot yet | Heart condition | A figure turned away with a short slash under it. | a crying face · a broken heart |
| 322 | `condition_icons` `cond-smitten` | `art/icons/conditions/smitten.png` | Smitten | white-ink sign | in game now · placeholder · no slot yet | Heart condition | A figure with a small heart floating above its head. | a heart emoji · a cupid |
| 323 | `condition_icons` `cond-last-turn` | `art/icons/conditions/last-turn.png` | Last Turn | white-ink sign | in game now · placeholder · no slot yet | State word | An hourglass with one grain left. | a clock face with numbers · a skull |
| 324 | `condition_icons` `cond-augment-offline` | `art/icons/conditions/augment-offline.png` | Augment Offline | white-ink sign | in game now · placeholder · no slot yet | Body condition | A prosthetic arm with a small cut-power mark. | a real brand · lightning |

## Shared: the weapon techniques

**Ink:** `#FFFFFF`. The 65 techniques of `data/techniques.json` are the Attack tab's rows (openers, strikes, links, finishers, answers; fire, press, set, take, watch). **None has an icon and the rows have no icon slot** (the area header shows the weapon's icon). The five finishers are under Raw Power and the six press techniques under Dexterity; these are the other 54.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 325 | `technique_icons` `tech-lunge` | `art/icons/techniques/lunge.png` | Lunge (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, opener | Wick in a deep lunge, blade point leading. | fencing gear · a second figure |
| 326 | `technique_icons` `tech-charge` | `art/icons/techniques/charge.png` | Charge | Wick icon | in game now · placeholder · no slot yet | Technique, opener | Wick running head-down with a weapon forward, three speed lines. | a horse · a vehicle |
| 327 | `technique_icons` `tech-feint` | `art/icons/techniques/feint.png` | Feint | Wick icon | in game now · placeholder · no slot yet | Technique, opener | Wick's blade pointing one way while his body steps the other, a dotted arc. | a magician · two Wicks |
| 328 | `technique_icons` `tech-draw-cut` | `art/icons/techniques/draw-cut.png` | Draw Cut | Wick icon | in game now · placeholder · no slot yet | Technique, opener | A blade leaving its scabbard in one curved cut line. | a katana from a known work · blood |
| 329 | `technique_icons` `tech-ambush` | `art/icons/techniques/ambush.png` | Ambush | Wick icon | in game now · placeholder · no slot yet | Technique, opener | Wick springing from behind a low wall, blade raised. | a jack-in-the-box · a monster |
| 330 | `technique_icons` `tech-cut` | `art/icons/techniques/cut.png` | Cut | Wick icon | in game now · placeholder · no slot yet | Technique, strike | One clean diagonal blade line. | blood · a kitchen knife |
| 331 | `technique_icons` `tech-sweep` | `art/icons/techniques/sweep.png` | Sweep | Wick icon | in game now · placeholder · no slot yet | Technique, strike | A long weapon swinging a low flat arc at ankle height. | a broom · the Open Hand Sweep (that is a leg) |
| 332 | `technique_icons` `tech-bash` | `art/icons/techniques/bash.png` | Bash | Wick icon | in game now · placeholder · no slot yet | Technique, strike | A blunt head striking a small ring with three impact ticks. | a baseball bat · blood |
| 333 | `technique_icons` `tech-sunder` | `art/icons/techniques/sunder.png` | Sunder | Wick icon | in game now · placeholder · no slot yet | Technique, strike: breaks the foe's weapon | A heavy blade striking a rifle across its middle, the rifle cracking. | an explosion · a real gun make |
| 334 | `technique_icons` `tech-flurry` | `art/icons/techniques/flurry.png` | Flurry | Wick icon | in game now · placeholder · no slot yet | Technique, strike | Three quick blade lines stacked one after another. | a blender · motion blur |
| 335 | `technique_icons` `tech-hamstring` | `art/icons/techniques/hamstring.png` | Hamstring | Wick icon | in game now · placeholder · no slot yet | Technique, strike | A low cut behind a partial leg, a small ring at the cut. | blood · an animal |
| 336 | `technique_icons` `tech-bind` | `art/icons/techniques/bind.png` | Bind | Wick icon | in game now · placeholder · no slot yet | Technique, strike | Two blades locked together at the guards. | crossed swords standing still (show the lock) · a chain |
| 337 | `technique_icons` `tech-half-sword` | `art/icons/techniques/half-sword.png` | Half-Sword | Wick icon | in game now · placeholder · no slot yet | Technique, strike | A hand gripping a blade halfway along its length, point forward. | blood · a known film's knight |
| 338 | `technique_icons` `tech-throw` | `art/icons/techniques/throw.png` | Throw | Wick icon | in game now · placeholder · no slot yet | Technique, strike | A knife leaving Wick's hand end over end. | a baseball · a dart board |
| 339 | `technique_icons` `tech-pull-out` | `art/icons/techniques/pull-out.png` | Pull Out | Wick icon | in game now · placeholder · no slot yet | Technique, strike | A hand drawing a blade back out of a post. | blood · a sword in a stone |
| 340 | `technique_icons` `tech-sidestep` | `art/icons/techniques/sidestep.png` | Sidestep | Wick icon | in game now · placeholder · no slot yet | Technique, link | Wick stepping sideways, a dart passing where he stood. | a dance step chart · a ninja |
| 341 | `technique_icons` `tech-guard-tech` | `art/icons/techniques/guard-tech.png` | Guard (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, link: the weapon guard | Wick's blade held across his body at a high guard. | a heater shield · a knight |
| 342 | `technique_icons` `tech-shove-tech` | `art/icons/techniques/shove-tech.png` | Shove (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, link | A single palm pushing a partial figure back one step. | the Palm form (two palms) · a cliff |
| 343 | `technique_icons` `tech-trip` | `art/icons/techniques/trip.png` | Trip | Wick icon | in game now · placeholder · no slot yet | Technique, link | A foot hooking a partial ankle, the figure tipping. | a banana peel · a cartoon fall |
| 344 | `technique_icons` `tech-drag` | `art/icons/techniques/drag.png` | Drag | Wick icon | in game now · placeholder · no slot yet | Technique, link | A hand hauling a partial figure by the collar along the ground. | a body bag · blood |
| 345 | `technique_icons` `tech-parry` | `art/icons/techniques/parry.png` | Parry | Wick icon | in game now · placeholder · no slot yet | Technique, answer | Wick's blade turning another blade aside with a small spark tick. | a shield · crossed swords standing still |
| 346 | `technique_icons` `tech-riposte-tech` | `art/icons/techniques/riposte-tech.png` | Riposte (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, answer | A parry turning into a point thrust in one curved line. | two crossed swords · fencing gear |
| 347 | `technique_icons` `tech-keep-back` | `art/icons/techniques/keep-back.png` | Keep Back | Wick icon | in game now · placeholder · no slot yet | Technique, answer | A long polearm held level at a partial figure's chest, holding it off. | a fence · a real spear make |
| 348 | `technique_icons` `tech-shot` | `art/icons/techniques/shot.png` | Shot | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A single bullet line from a muzzle. | muzzle flash fire · blood |
| 349 | `technique_icons` `tech-snap-shot` | `art/icons/techniques/snap-shot.png` | Snap Shot | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A pistol fired from the hip, a short quick line. | a cowboy · a camera |
| 350 | `technique_icons` `tech-burst` | `art/icons/techniques/burst.png` | Burst | Wick icon | in game now · placeholder · no slot yet | Technique, fire | Three short bullet lines in a tight group. | a firework burst · blood |
| 351 | `technique_icons` `tech-aimed-shot` | `art/icons/techniques/aimed-shot.png` | Aimed Shot | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A rifle with a long straight sight-line to a small ring. | a crosshair over a head · a scope glint |
| 352 | `technique_icons` `tech-called-shot-tech` | `art/icons/techniques/called-shot-tech.png` | Called Shot (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A ring drawn round one limb of a silhouette. | a crosshair over a head · text |
| 353 | `technique_icons` `tech-walking-fire` | `art/icons/techniques/walking-fire.png` | Walking Fire | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A row of bullet lines stepping forward across the ground. | footprints · a machine gun nest |
| 354 | `technique_icons` `tech-punch-through` | `art/icons/techniques/punch-through.png` | Punch Through | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A bullet line passing through a plate and out the other side. | glass shards · blood |
| 355 | `technique_icons` `tech-lob` | `art/icons/techniques/lob.png` | Lob | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A high dotted arc from a launcher to a small ring. | a basketball · a firework |
| 356 | `technique_icons` `tech-heavy-bolt` | `art/icons/techniques/heavy-bolt.png` | Heavy Bolt | Wick icon | in game now · placeholder · no slot yet | Technique, fire | A thick crossbow bolt in flight, a heavy wake line. | a lightning bolt · a real crossbow make |
| 357 | `technique_icons` `tech-bead` | `art/icons/techniques/bead.png` | Bead | Wick icon | in game now · placeholder · no slot yet | Technique, set | A front sight post lined up on a small dot. | a bead necklace · a scope logo |
| 358 | `technique_icons` `tech-spot` | `art/icons/techniques/spot.png` | Spot | Wick icon | in game now · placeholder · no slot yet | Technique, set | A hand shading the eyes, a sight-line to a far dot. | binoculars brand · a spotlight |
| 359 | `technique_icons` `tech-brace-tech` | `art/icons/techniques/brace-tech.png` | Brace (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, set | A rifle's fore-end resting on a wall edge. | a bipod (Suppressor) · a dental brace |
| 360 | `technique_icons` `tech-load-special` | `art/icons/techniques/load-special.png` | Load Special | Wick icon | in game now · placeholder · no slot yet | Technique, set | One marked round pressed into a magazine's top. | a rocket · glowing magic |
| 361 | `technique_icons` `tech-shift` | `art/icons/techniques/shift.png` | Shift | Wick icon | in game now · placeholder · no slot yet | Technique, set | Wick shifting his weight foot to foot, a small arrow under him. | a gear shift · a keyboard key |
| 362 | `technique_icons` `tech-vent` | `art/icons/techniques/vent.png` | Vent | Wick icon | in game now · placeholder · no slot yet | Technique, set | A gun barrel with three heat curls. | steam train · fire |
| 363 | `technique_icons` `tech-head-down` | `art/icons/techniques/head-down.png` | Head Down | Wick icon | in game now · placeholder · no slot yet | Technique, set | Wick ducking low behind a wall, only his flame showing. | a turtle · a helmet |
| 364 | `technique_icons` `tech-dead-centre` | `art/icons/techniques/dead-centre.png` | Dead Centre | Wick icon | in game now · placeholder · no slot yet | Technique, take | A bullet line striking the exact centre of a ring. | a dart board · a skull |
| 365 | `technique_icons` `tech-pin-down` | `art/icons/techniques/pin-down.png` | Pin Down | Wick icon | in game now · placeholder · no slot yet | Technique, take | A foe flat behind cover under three bullet lines. | a pushpin · a map pin |
| 366 | `technique_icons` `tech-rout` | `art/icons/techniques/rout.png` | Rout | Wick icon | in game now · placeholder · no slot yet | Technique, take | Three small figures running away from a gun line. | a white flag · a chase scene |
| 367 | `technique_icons` `tech-stopping-shot` | `art/icons/techniques/stopping-shot.png` | Stopping Shot | Wick icon | in game now · placeholder · no slot yet | Technique, take | A charging silhouette stopped mid-stride by a bullet line. | a stop sign · blood |
| 368 | `technique_icons` `tech-storm` | `art/icons/techniques/storm.png` | Storm | Wick icon | in game now · placeholder · no slot yet | Technique, take | A dense rain of bullet lines over a wide area. | weather icons · lightning |
| 369 | `technique_icons` `tech-last-round` | `art/icons/techniques/last-round.png` | Last Round | Wick icon | in game now · placeholder · no slot yet | Technique, take | A single round standing alone in an open magazine. | a skull · a clock |
| 370 | `technique_icons` `tech-overwatch-tech` | `art/icons/techniques/overwatch-tech.png` | Overwatch (technique) | Wick icon | in game now · placeholder · no slot yet | Technique, watch | Wick lying still, a long sight-line across a lane. | a tower · an eye logo |
| 371 | `technique_icons` `tech-deny` | `art/icons/techniques/deny.png` | Deny | Wick icon | in game now · placeholder · no slot yet | Technique, watch | A bullet line cutting across a doorway gap. | a no-entry road sign · a wall |
| 372 | `technique_icons` `tech-cover-me` | `art/icons/techniques/cover-me.png` | Cover Me | Wick icon | in game now · placeholder · no slot yet | Technique, watch | Wick firing past a partial ally who runs across. | a blanket · a shield |
| 373 | `technique_icons` `tech-dead-to-rights` | `art/icons/techniques/dead-to-rights.png` | Dead to Rights | Wick icon | in game now · placeholder · no slot yet | Technique, watch | A sight-line pinning a silhouette caught in the open. | handcuffs · a skull |
| 374 | `technique_icons` `tech-shield-bash` | `art/icons/techniques/shield-bash.png` | Shield Bash | Wick icon | in game now · placeholder · no slot yet | Technique, strike (shield) | A round shield driven forward into a partial figure. | a heater shield · blood |
| 375 | `technique_icons` `tech-raise-shield` | `art/icons/techniques/raise-shield.png` | Raise Shield | Wick icon | in game now · placeholder · no slot yet | Technique, link (shield) | Wick lifting a round shield to his eye line. | a riot shield with text · a heater shield |
| 376 | `technique_icons` `tech-grapple` | `art/icons/techniques/grapple.png` | Grapple | Wick icon | in game now · placeholder · no slot yet | Technique, link | Two arms locking round a partial figure. | a wrestling ring · the old Grapple perk icon pose (show the lock from behind) |
| 377 | `technique_icons` `tech-shield-wall` | `art/icons/techniques/shield-wall.png` | Shield Wall | Wick icon | in game now · placeholder · no slot yet | Technique, answer (shield) | Two round shields overlapping edge to edge. | a castle wall · a phalanx from a known film |
| 378 | `technique_icons` `tech-interpose` | `art/icons/techniques/interpose.png` | Interpose | Wick icon | in game now · placeholder · no slot yet | Technique, answer (shield) | Wick stepping between a dart and a partial ally, shield up. | a heater shield · wings |

## No slot yet

These families are in the game but **no screen draws art for them**: their placeholders exist (`slot: false` in the list) and
are catalogued, so the day a screen gets a slot it reads them by id; no UI was built for them in this change (the rule).

| Family | Placeholders | Why there is no slot |
| --- | --- | --- |
| move | 105 | door moves, class moves, the Open Hand forms: an action row on the fight screen (`commands.ts actionGroups`) and the class tab list have no icon; the class tab shows the class emblem only |
| tech | 65 | the Attack tab's technique rows: no icon (the area header shows the weapon's icon) |
| shadow | 20 | the Shadow tab's verbs and group headers: no icon (C2, never delivered or wired) |
| figorder | 7 | Figment orders: the 8 order icons delivered 15 Nov (`figment_order_icons`) are catalogued but not built by `npm run assets` and no row draws them; the 7 below have none at all |
| figtrait | 10 | Figment traits: the data's 10 traits; the 12 trait icons delivered 15 Nov are for traits not in the data yet; no chip draws a trait icon |
| tend | 15 | the Tend tab's verbs: no icon (the 13 Nov request C3 was never delivered or wired) |
| prayer | 2 | the Chaplain's Ward (a door verb that is a Whisper) and Sanctuary (a Hymn): the faith tab lists the patron's Whispers and Hymns only; a class Hymn would draw its patron's Hymn icon (another thing's picture) if it were listed there |
| cond | 61 | conditions: words on tokens, the hover card and the log |
| door emblems (9) | 0 (designed) | the door tab, the first-fight tip and the token chips draw words and SVG pips (`doorView.ts`) |
| class portraits (9) | 0 (designed) | the class card shows the code-drawn emblem (`classIcons.ts`) |
| camp step marks (5) | 0 (designed) | the hotfix line's checklist headers are words (`LoadoutScreen.tsx stepHead`) |

## Placeholders (made by this change)

**305 placeholders** for the in-game rows above that had no art of their own, written by ONE script,
`tools/art/make_placeholders.py`, from the list `art/briefs/placeholders-2026-11-16.json` ({id, catalog, family, label, tint,
path}). Each is a simple frame in its mode (a rounded tile with a small flame for a Wick icon, a circle for a sign, a hexagon
for an emblem, a tall card for a portrait, the 64-grid line root for a monoline icon), the item's short label in its door's
ink, and a small **PH** in the corner, so a placeholder is recognisable on screen and searchable (`placeholder: true` in
`art/catalog.json`). Where the build needs a raster (perks, gear) the file is a 1024 PNG; elsewhere an SVG.
`tools/validate_art.py` reports them as one allowed exception (the white-ink, palette and line-icon rules are skipped for
`placeholder: true` entries; files, sizes and checksums are still checked).

**Drawn by a screen today (20):** the 18 alpha perks (catalog `perks`: the entry's `path` is the placeholder, the old
icon is kept as `previous_revision_path`, so the perk card, the level-up screen and the road map no longer show the old
perk's picture), the Open Hand (catalog `gear` `mod-open_hand`, built as `gear-open_hand`) and Glimmer (catalog
`figment_icons` `figment-glimmer`, named by `data/figments.json` `items.glimmer.icon`).

**Wired in this change (art that existed):** Survival's lobby card (catalog `survival_art` `survival-card-title`, the
delivered `title-survival.png`; `art_pending` dropped in `data/modes.json`), the medic (`rest-medic`, the delivered
`rest-medic.png`; `portrait_pending` dropped in `data/survival.json`), and Contraband (`tools/build_web_assets.py gear_key`: a
`loot-<id>` painting whose id is an item builds as `gear-<id>`).

**Not given a placeholder, on purpose:** the 20 weapon and focus **variants** (`data/variants.json`) show their base weapon's
painting by design (`gearIcons.ts variantBase`: a variant is that weapon, tuned), so a placeholder would replace a right
picture with a worse one; the four **gloves** show their own monoline icons; the **Scrap Turret** shows its own line icon on a
plate. Their paintings are rows above.

## Already requested elsewhere (folded in here)

The 13 Nov Classes 3.0 rows that were **never delivered** (C1 Ward, Sanctuary, Smite, Verdict, Reflex, Run and Gun; C2 the
Shadow group marks, Toxin, Sabotage, Execution, Called Shot; C3 and C3b the Tend verbs and the Mender's moves; C4 the ten
Figment traits, Salvage, Overclock, Scrap Turret) are rows of this file now, with their pictures re-invented where the
door changed; `GPT-PROMPTS-2026-11-13-classes-3.0.md` is kept as history. The 15 Nov Figments file's three still-wanted
icons (Filch, Cash in, Glimmer) are rows here too. Nothing of `GPT-PROMPTS-2026-11-15-everything-missing.md` is still
missing (delivered 15 Nov).

## For the builder (later; not the artist)

- A screen slot for an action row's icon (the fight tabs, the class tab), then build the maps `move_icons`, `technique_icons`,
  `tending_icons`, `shadow_icons`, `figment_order_icons`, `figment_trait_icons` and `condition_icons` (`npm run assets`): the
  placeholders appear at once and the delivery replaces them by id. A Leon call: these are new UI.
- The class card and the door tab: a slot for `class_portraits` and `door_emblems`.
- A class Hymn on the faith tab must name its own icon (`prayerFile` names a Hymn by patron and tier).
