# The title screen (spec, 6 Nov 2026; art integrated 7 Nov 2026)

Leon: "make me a starting screen worthy of a AAA game." It replaces today's home screen with its header bar. Art brief: `art/briefs/title-screen.md`. The artist's layers (`art/ui/title-screen/`) and Wick's five clips (`art/mascot/wick-anim/`) are in (§10 lists what changed on 7 Nov).

## 1. What the player sees

- **Full bleed, no header.** The painted layers fill the window: back (sky, city, the Celestial descending), middle (the battlefield), front (the five heroes on the ridge). **The front layer is held** (Leon, 7 Nov: `title-front.png` is being remade); the screen runs on back + middle until it lands. Embers and rising mana motes drift between the middle and front layers (code, not art).
- **The title**, in the left ~38% of the screen (the art keeps that zone dark and empty):
  - **PROJECT HEAVEN CRY** in Spectral, very large (up to 128 px, never under 28 px), one word per line (PROJECT / HEAVEN / CRY), wide letter-spacing, warm ivory with a faint light bleed as if the Celestial were lighting it. Its size is **measured, not guessed** (§8), so no word is ever clipped.
  - One small line under it in Chakra Petch: *A tactical RPG with an AI Narrator*.
- **The menu** under the title, left-aligned, Chakra Petch 22–26 px, uppercase, 0.14 em spacing, one item per line with generous gaps:

| Item | Shows when | Goes to |
|---|---|---|
| **CONTINUE** · *room CODE, 2 h ago* | There is a saved room | Resumes the most recent room |
| **NEW GAME** | Always | Host a new room (asks your name first if there is none) |
| **PROVING GROUND** · *practice fights* | Always | The practice arena (asks your name first if there is none) |
| **JOIN A FRIEND** | Always | Enter a room code |
| **CHARACTERS** | Always | The character library: make, open, import, download |
| **SAVED GAMES** | There are saved rooms | Every saved room: resume or forget |
| **SETTINGS** | Always | Your name, sound and music volume, the Narrator's voice, reduce motion, tips |
| **CREDITS** | Always | Art, music, sounds, code (from the credits manifest) |

- **The footer**, small and muted, bottom-left: version · *⚑ Report a problem* · "Your API key stays in your browser."

## 2. The first moment: press any key

The first time the screen opens in a visit, the menu isn't there yet: only the art, the title and a pulsing **PRESS ANY KEY** (*TAP TO BEGIN* on touch). It does two jobs: it is the AAA beat, and it is the click browsers require before they allow sound. On press: a deep confirm sound, the title settles up a little, and the menu items fade in one after another (40 ms apart). Later visits to the title in the same session skip it.

## 3. Hover: Wick runs to you

- **Hovering or keyboard-focusing an item:**
  - its text goes from muted ivory to white and opens its letter-spacing by 0.04 em (150 ms);
  - an ink underline sweeps in left to right (200 ms);
  - a soft hover tick plays (at most one every 60 ms).
- **Wick is the selector.** A small flat-ink Wick (about 47 px tall in a 60 px frame) runs along the left gutter of the menu to the item and stops beside it, facing the text. He uses the artist's five clips (`art/mascot/wick-anim/manifest.json`), never mirrored (clips in the table below).
  - The first time, Wick runs in from off-screen left (about 900 px/s).
  - After that, Wick runs up or down the gutter to the new item (about 900 px/s, eased, 180–500 ms).
  - On arrival: the stop frames, then the idle loop.
  - Wick's footstep pitter-patter plays quietly in time with the run.
  - The game uses the **presentation strips** (the hello's jump baked in), not the root-motion track: one approach only, as the art README asks.
- **Keyboard:** arrow keys or Tab move the selection the same way (Wick runs); Enter presses; Escape goes back.

| Clip | Frames · fps | Plays when |
|---|---|---|
| **run** | 8 · 12, loop | Running in from off-screen left the first time, and up or down the gutter to a new item |
| **stop** | 4 · 12, once | On arrival; it ends in the idle pose and hands straight to idle |
| **idle** | 4 · 8, loop | Waiting beside the item |
| **hello** | 16 · 12, once | A press (sped up to 20 fps so it fits the slide) and the greeting |
| **wave** | 4 · 10, loop | Holds the hello's apex: the greeting (hello 1–11, wave × 3, hello 12–16) after the first key press, with a "Hi!" bubble and the chirp; and once per item if you wait on it 14 s (no bubble, no sound) |

## 4. Press: the click, then Wick says hello, then the slide

1. **0 ms:**
   - The item presses in (scales to 0.97, 80 ms), its underline flashes white, and a small burst of square motes (bots) jumps out from the pointer.
   - The click sound plays (the grander "start" sound for NEW GAME and CONTINUE).
2. **0–700 ms:** **Wick jumps up and says hello.** The hello sequence plays, a speech bubble pops above Wick ("Hello!", or a short line for the item: "Let's go!", "Who's there?"), and Wick's hello chirp plays at the jump's apex.
3. **About 550 ms:** **the screen slides.** The menu column and the front layer slide out to the left while the next screen slides in from the right (400 ms, ease-in-out). The middle and back layers slide less than the front, so the slide itself has depth. A soft whoosh plays.
4. Clicking or pressing Enter again **on the same item** during the hello skips straight to the slide; pressing **another** item switches the press to it (the hello restarts there).
5. **Hover never locks.** During the hello and the slide the menu keeps its hover and focus feedback (highlight, underline, tick): nothing sets `pointer-events: none` or `inert` on it until a sub-screen has actually opened. Only Wick stays beside the pressed item until the hello ends, then runs to wherever you are pointing.
6. **Back** (Escape, or a ‹ Back on the next screen) slides the other way with the back sound.

## 5. Parallax

- The pointer's offset from the screen centre moves each layer. Horizontal: back ±0.8%, middle ±2.5%, front ±5% of the width; vertical: half that. **Capped by the art's overscan:** no layer moves more than 246 × 69 canvas px (the shifts the artist verified in `technical-review.json`), whatever the window.
- The whole stack tilts with it (rotateY/rotateX up to ±1.5° on a 1200 px perspective).
- Motion follows the pointer with smoothing (8% of the gap per frame), so it glides rather than snaps.
- When the pointer rests, the layers drift on a slow 20 s loop so the picture never freezes.
- **Touch devices:** the device's tilt drives it where the browser allows, otherwise only the idle drift.
- **Reduce motion** (the system setting or our Settings toggle): no parallax, tilt or drift; Wick appears beside the item instead of running; the slide becomes a 150 ms fade.

## 6. The other screens get the same feel

The sub-screens the menu opens (join, characters, saved games, settings, credits, the name prompt) sit on the same art, darkened and blurred, with no header bar, a ‹ Back in the corner, and the same button behaviour (press effect and click sound). The room, play and combat screens keep their layouts but get the button sounds (§7).

## 7. Sounds

All CC0, in `apps/web/public/sfx/`, credited on the Credits page (`game/sfxCredits.ts`). Chosen by research, not by ear: **Leon, listen and swap any you don't like** (each is one line in `game/sfx.ts`).

| Event | Where | Character | File |
|---|---|---|---|
| `hover` | Title and sub-screen menu items, tabs | A soft, short tick | Kenney Interface Sounds `select_001` |
| `click` | Every button in the game | A crisp, small press | Kenney `click_001` |
| `start` | NEW GAME, CONTINUE, Start session | A deeper confirm, a little grand | Kenney `confirmation_002` |
| `back` | Back, Escape, Close | A softer, lower press | Kenney `back_001` |
| `slide` | Screen transitions | A short airy whoosh | Kenney `maximize_004` (forward), `minimize_004` (back) |
| `error` | A refused action (the red toast) | A muted double buzz | Kenney `error_004` |
| `toggle` | Checkboxes, switches | A light switch | Kenney `toggle_001` / `toggle_002` |
| `tab` | Sheet tabs, family tabs | A paper or plastic flick | Kenney `pluck_001` |
| `wick_hello` | Wick's hello | A short happy robot chirp | fupi, *Cute Mission Complete* (OpenGameArt), pitched up two semitones |
| `wick_steps` | Wick running | Tiny quick footsteps | Synthesised in the game: tiny metal taps |

- **Volume:** UI sounds have their own slider in Settings (default 60%) and a mute. They duck under the Narrator's voice like the music.
- **Hover sounds** only on menus and tabs, never on every button (that gets noisy).
- **Loading:** sounds are small files loaded on first use through Web Audio, so they play instantly and overlap cleanly.

## 8. Building it

- **One React title component**, not a DC template: it needs per-frame pointer work.
  - Layers are absolutely positioned images moved with `translate3d` in one `requestAnimationFrame` loop.
  - The particles are a small canvas between the middle and front layers.
  - Wick is a sprite element animated with CSS `steps()` from the strip images.
- **Art files** (`tools/build_web_assets.py` → `apps/web/public/assets/`, names in `src/game/assets.json`):
  - Each layer is exported **whole** (4096 × 2304 canvas with its overscan) at three widths: `title-<layer>` 1600 px, `-lg` 2560 px, `-xl` 3840 px. Back is opaque WebP (about 160 / 290 / 470 KB); middle keeps its alpha (about 200 / 440 / 700 KB). The layer is an `<img srcset>` sized to the painted canvas on screen, so the browser picks the file by window size and pixel density.
  - The title shows a dark gradient and the wordmark until a layer loads, then fades it in (0.6 s).
  - **Adding the front layer later:** drop the remade `title-front.png` into `art/ui/title-screen/`, remove `"front"` from `TITLE_HELD` in the build script and run `npm run assets`. The screen shows any of `back`, `mid`, `front`, `fx` that is present in `assets.json`, in that order; no code change.
  - Wick: `wick-run`, `wick-stop`, `wick-idle`, `wick-hello`, `wick-wave`, one strip of 256 px frames each, from the manifest's presentation strips. If they are missing, Wick's welcome mark with a CSS bounce stands in.
- **Placing the art** (`src/title/geometry.ts`, tested in `geometry.test.ts`): the canvas is scaled so its central safe rect (256, 144 → 3840, 2160) covers the window. A 16:9 window shows exactly the safe rect. A narrower window keeps the right of the picture, moving toward the phone crop's centre (x 2785), so a portrait phone shows the artist's phone crop (the Celestial over the squad); the visible window never leaves the safe rect.
- **Fitting the title:** after layout and again when the fonts load or the window resizes, the screen measures the widest word at 100 px and sizes the title so it fits the column's width and the height the menu leaves (before the key press the menu's height is estimated, so the title doesn't jump when it appears). 28–128 px. If even 28 px can't fit (a very short window), the column scrolls rather than clip.
- **Wick's frames** are stepped by `requestAnimationFrame` on one element, so his animation never re-renders the menu.
- **The DC home screen's jobs** (name, host, join, resume, the character library) move into the sub-screens; nothing they do is lost.

## 9. Pass criteria

1. No header bar; the title and menu read over the art at every window size from 1280 × 720 to 2560 × 1440, and on a phone in portrait. **The whole title shows, unclipped**, at 1280 × 720, 1440 × 900, 1920 × 1080, 2560 × 1440, 900 × 800 and 390 × 844.
2. Hover, keyboard focus and touch all move Wick; Enter and click both press.
3. The press → hello → slide sequence finishes in under 1.1 s and can be skipped; hovering other items during it still highlights them.
4. Reduce motion removes all parallax and running.
5. No sound plays before the first key press or click; after it, every button in the game clicks.

## 10. What changed on 7 November 2026

Leon: the title "keeps missing a few words"; hovering is dead while Wick says hello; integrate the artist's 4K layers and Wick's clips; `title-front.png` is being remade, so do the rest first.

1. **The art is in.** `title-back.png` (the sky, the city and the Celestial) and `title-mid.png` (the battlefield) replace the stand-ins (the Outpost illustration and the code-drawn glow are gone). Exported at 1600 / 2560 / 3840 px, picked by the browser; placed by the safe rect; parallax capped by the verified overscan (§5, §8).
2. **The front layer is ready but held** until the remade file lands (§8, "Adding the front layer later").
3. **Wick is the artist's Wick:** run in, stop, idle, hello on a press, a greeting with the wave after the key press, a wave if you linger (§3).
4. **The title always fits** (it was a fixed `clamp()` that overflowed the 560 px column: HEAVEN at 128 px is about 600 px wide). Measured per word against the column (§8). The column now starts at the window's edge with the margin as padding, so Wick's run-in starts off-screen instead of popping out of the margin.
5. **Hover works during the hello and the slide** (§4.5). A second click on another item switches to it instead of running the first item's action, which it used to do.

