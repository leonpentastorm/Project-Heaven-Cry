# Title screen: three-layer parallax key art, and Wick's menu animations

**From Leon, 6 November 2026. Start now.** The title screen is being rebuilt to feel like a AAA game's front door: no header bar, full-bleed art, a big **PROJECT HEAVEN CRY**, and the menu under it. The art is **three painted layers** that shift and turn with the mouse. A little **Wick** runs to whichever menu item you point at, and jumps up to say hello when you press it. Screen behaviour (for reference, not for painting): `docs/design/title-screen.md`.

Two deliverables: **A. the key art** (three layers) and **B. Wick's animations**. Both follow the style guide (`art/style-guide/v1.3/PHC-Style-Guide.md`).

---

## A. The key art: three layers

### The picture

A squad of five heroes stands on a ridge at the edge of a battle, weapons ready, looking out across the burning field toward a great city on the horizon, where the sky has split open and a **Celestial is descending**. It is the moment the game is named for: Heaven coming down, and people with guns and spells waiting for it.

| Layer | What it holds | Depth |
|---|---|---|
| **Front** | The five heroes on the ridge (rock, a broken rampart, sandbags, a fallen banner) | Nearest; moves the most |
| **Middle** | The battlefield: trenches, craters, smoke, fires, distant troops and robots, tracer lines, and **motes rising from the dead** (in this world the dead feed the air with mana) | Between |
| **Back** | The sky, the city skyline on the horizon, and the Celestial descending through the opened clouds | Farthest; moves the least |

### The heroes (front layer)

Seen from behind or three-quarter behind, looking out toward the city: we see them **waiting for it**, so faces show in profile or lost profile at most. Each one must read by silhouette alone. They stand in the **right 60%** of the frame (the left is kept for the title and menu; see Composition).

1. **The Soul spellsword: Leon's character, reference attached** (`title-screen/ref-spellsword-soul.webp`). A lean man, swept-back grey-brown hair tied low, a long dark leather coat over a loose pale shirt, a cracked ivory ceramic pauldron on one shoulder, a teal sash, a single-edged blade held low in one hand. On the other hand, a brass-ringed **Emanator gauntlet** crackling with **violet Soul lightning**. Paint him as the lead: closest to centre, the gauntlet raised and charging, the blade angled down and ready. Keep his face, hair, coat, pauldron and gauntlet true to the reference; the pose is new.
2. **The gunner:** a woman with a long rifle, one knee on the rampart, cheek to the stock, a coat tail lifting in the wind. Cold, still, patient.
3. **The Sigil mage:** a young, slight figure (androgynous) with an **Evoker** (an angular engraved device, held like a stylus or a pistol-grip instrument) drawing a **cyan glyph** in the air: hard straight lines and a circle, crisp, not smoky. Mind magic is precise; it must look nothing like the spellsword's violet.
4. **The tank:** a big older man in heavy plate and ballistic armour, a tall dented shield planted in front of the group, the first one the enemy would reach.
5. **The support:** a field medic, a woman with a satchel and a lantern, one hand on the tank's shoulder or reaching to a stim on her belt. Her lantern is the warmest small light in the front layer.

Mixed builds, ages and skin tones (the set rule from the archetype brief). Nobody in the squad is a copy of a character from any other game, film or comic (the Unspoken Name).

### The Celestial (back layer)

Celestials are people from the layer above who play god inside the world. They appear only through a cause, and an appearance is a very big deal (World Bible). Paint the **scale and wrongness** of that.

- A **vast human-shaped figure** coming down through a hole in the clouds above the city, many times taller than the towers. Built of **swarming light and square motes** (bots), denser at the core, fraying at the edges.
- It wears a **grand costume** it has imagined for itself: ceremonial robes, armour or wings of light. Nothing from a real religion's or franchise's iconography, nothing recognisable.
- **No readable face**: a mask, a blaze of light, or a face too bright to see. Arms half open: blessing or threat, we can't tell.
- Rings of glyph-like light turn around it. Columns of light fall onto the city.
- It is the **brightest thing in the picture** and the main light source: white-gold, cooler at the edges.

The city beneath is the Thousand-Planet City or Central City: towers, megastructures and bridges, lights coming on, some districts already burning. It is a real place being visited, not a fantasy castle.

### Composition and safe zones (for a 16:9 screen)

```
+--------------------------------------------------------------+
|  TITLE + MENU ZONE        |        sky / clouds / CELESTIAL  |
|  (left ~38%)              |          (x 55–75%, y 5–45%)     |
|  keep the FRONT layer     |                                  |
|  empty here; keep the     |  ---------- city horizon -------- |  y ≈ 55–60%
|  values DARK and calm     |   battlefield band (middle layer)|  y ≈ 45–80%
|  (white text sits on it)  |        HEROES on the ridge       |
|                           |        (front layer, x 45–100%,  |
|                           |         cut by the bottom edge)  |
+--------------------------------------------------------------+
```

- **Title and menu zone:** the left ~38%, from about 15% to 85% height. Nothing from the front layer goes here, and the back and middle layers stay darker and low-detail (smoke, night sky, distant haze), so white text passes contrast easily.
- **The Celestial:** upper centre-right. It must stay visible between the title zone and the heroes.
- **The heroes:** the right 45–100%, cut off by the bottom edge at about the knees. The spellsword is nearest the centre line.
- **Phone crop (9:16):** a vertical crop centred at x ≈ 68% must still hold the Celestial above and the spellsword below. Check it before delivering.

### Light and colour

- **Key light:** the Celestial, white-gold, from above centre-right. It rims the heroes' shoulders and hair.
- **Fill:** the battlefield's orange firelight from below.
- **The only two saturated accents** are the magic: **violet** (`#AE9BFF`, Soul) on the spellsword's gauntlet and **cyan** (`#4FC8DF`, Mind) on the mage's glyph. They are the game's two magic colours; keep everything else in the Heavenprint warm-and-charcoal range so they pop.
- Heavenprint brushwork exactly like the character portraits (anchors: `approved-original-27.jpg`, `approved-new-faces-27.jpg`, the archetype cards). This is a big painting, but it is the same painter.

### Painting for parallax (important)

The layers slide against each other by up to about **6% of the width** and tilt slightly, so:

1. **Paint behind everything.** Wherever the front layer covers the middle, the middle must be **fully painted underneath**, and the same for the back behind the middle. As the mouse moves, those hidden parts show.
2. **Overscan:** every layer is **4096 × 2304** (16:9 with a margin on all sides). Keep everything important inside the central **3584 × 2016**: the edges will be cropped as the layers move.
3. **Clean cut-outs:** the front and middle are transparent PNGs with straight (unpremultiplied) alpha. No white or dark halo on the edges. Smoke and atmosphere at the edges of the middle layer fade softly into transparency rather than being cut.
4. **Optional, welcome:**
   - a separate **FX layer** (embers, rain or god-rays) as its own transparent PNG;
   - a greyscale **depth map** per layer (white near, black far), for a subtle 3D tilt;
   - a split back layer (sky + Celestial apart from the city), which gives one more depth.

### Deliver A

- **Folder:** `art/ui/title-screen/`.
  - `title-back.png` (opaque) · `title-mid.png` (transparent) · `title-front.png` (transparent), each 4096 × 2304.
  - Optional: `title-fx.png`, `title-*-depth.png`, `title-sky.png` + `title-city.png`.
  - The layered source file (`.psd` or `.kra`).
  - `previews/composite-1920.jpg` (the three layers flattened), `previews/phone-crop.jpg` (the 9:16 crop), `previews/safe-zones.jpg` (the composite with the title zone marked).
- **`manifest.json`:** each file with its size, sha256 and role. Add the hashes to `art/checksums.sha256`, then run `python3 scripts/validate_art.py`; it must pass. I'll add catalog entries and wire it into the game.

### Pass criteria (A)

1. With white 72 px text placed in the title zone, everything reads.
2. Moving each layer 6% left and right shows no unpainted area and no halo.
3. The spellsword is recognisably the man in the reference.
4. Violet reads as Soul and cyan as Sigil at a glance, and nothing else in the picture competes with them.
5. The Celestial reads as enormous and wrong, not as an angel from a real religion or a character from any franchise.

---

## B. Wick's menu animations

Wick is the menu's selector. When you point at a menu item, a small Wick **runs in** and stops beside it. When you press it, Wick **jumps up and says hello** (waves) before the screen slides on.

### Style

**Flat white ink**, like Wick's welcome mark and app icon (`art/mascot/wick-welcome.png`), so the little runner sits cleanly beside white menu text on dark art. Same construction and anchors as every Wick: style guide sections 09 and 10 (clipped-corner ceramic head, recessed screen with pixel face, chibi body about 2.4 heads tall, mitten hands, broad boots, short asymmetric capelet, lantern heart). The screen face is drawn as pixel clusters in the negative space, as in the icons.

### Frames

All sequences are **256 × 256 px per frame**, transparent PNG. Wick is about **200 px tall** in the frame, with the **soles on a baseline at y = 240** in every frame, so the UI can line the frames up. The game shows Wick at **40–56 px tall** (so 2× and 4× masters are already sharp). Test every frame at 48 px.

| Sequence | Frames | Speed | What happens |
|---|---|---|---|
| **run** | 8, looping | 12 fps | Side three-quarter view, **facing right**, running in place (the UI moves Wick across). A big chibi run: head bobbing, capelet and tab flapping behind, mitten arms pumping, lantern heart bouncing. Screen face: Determined (sloping brows, short mouth). Footfalls on frames 2 and 6. |
| **stop** | 4 | 12 fps | Skids to a halt facing right, leaning back, then settles. Ends in the idle pose. |
| **idle** | 4, looping | 8 fps | Standing beside the text, facing right, a small bounce on the knees, one blink on the screen, the lantern pulsing once. This is the selector while you stay on an item. |
| **hello** | 16 | 12 fps | Crouch (2) → launch (2) → rise (3), **turning toward the viewer** as Wick goes up → apex: one mitten **waving** hello, screen face Delighted (raised eyes, wide stepped smile) (4) → fall (2) → land with a squash (3). |
| **wave** | 4, looping | 10 fps | The apex wave on its own, so the UI can hold the hello as long as it needs. Must loop seamlessly into itself and cut cleanly back into the hello's fall frames. |

- **No text in the art:** the UI draws the "Hello!" speech bubble.
- **Right-facing only:** Wick's clipped corner and capelet are asymmetric, so the UI never mirrors the frames (style guide: keep left and right identity consistent).

### Deliver B

- **Folder:** `art/mascot/wick-anim/`.
  - One subfolder per sequence (`run/`, `stop/`, `idle/`, `hello/`, `wave/`) of numbered frames (`run_00.png` …).
  - Plus one horizontal **sprite strip** per sequence (`run.png`: 8 × 256 wide).
  - A `preview.gif` of all five played in order.
  - A `manifest.json` with frame counts, fps, the baseline and footfall frames.
- **Optional:** the same as vector (an SVG per frame, or a Lottie file), which would stay crisp at any size.
- Add the hashes to `art/checksums.sha256` and run the validator.

### Pass criteria (B)

1. At 48 px tall, the run reads as Wick running, not as a white blob: head, screen and capelet all visible.
2. The run loops without a hitch; the feet don't slide against the baseline.
3. The hello's turn toward the viewer and the wave read clearly at 48 px; the Delighted face is visible.
4. It is unmistakably the same Wick as the trait icons and the welcome mark.
