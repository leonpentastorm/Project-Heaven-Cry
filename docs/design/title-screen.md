# The title screen (spec, 6 Nov 2026)

Leon: "make me a starting screen worthy of a AAA game." It replaces today's home screen with its header bar. Art brief: `art/briefs/title-screen.md`. Until the art lands, the screen runs on stand-in layers cut from existing illustrations, so the code and the art can proceed in parallel.

## 1. What the player sees

- **Full bleed, no header.** The three painted layers fill the window: back (sky, city, the Celestial descending), middle (the battlefield), front (the five heroes on the ridge). Embers and rising mana motes drift between the middle and front layers (code, not art).
- **The title**, in the left ~38% of the screen (the art keeps that zone dark and empty):
  - **PROJECT HEAVEN CRY** in Spectral, very large (clamp 56–128 px), set in two lines (PROJECT HEAVEN / CRY), wide letter-spacing, warm ivory with a faint light bleed as if the Celestial were lighting it.
  - One small line under it in Chakra Petch: *A tactical RPG with an AI Narrator*.
- **The menu** under the title, left-aligned, Chakra Petch 22–26 px, uppercase, 0.14 em spacing, one item per line with generous gaps:

| Item | Shows when | Goes to |
|---|---|---|
| **CONTINUE** · *room CODE, 2 h ago* | There is a saved room | Resumes the most recent room |
| **NEW GAME** | Always | Host a new room (asks your name first if there is none) |
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
- **Wick is the selector.** A small flat-ink Wick (about 48 px tall) runs along the left gutter of the menu to the item and stops beside it, facing the text.
  - The first time, Wick runs in from off-screen left.
  - After that, Wick runs up or down the gutter to the new item (about 900 px/s, eased).
  - On arrival: the stop frames, then the idle loop.
  - Wick's footstep pitter-patter plays quietly in time with the run.
- **Keyboard:** arrow keys or Tab move the selection the same way (Wick runs); Enter presses; Escape goes back.

## 4. Press: the click, then Wick says hello, then the slide

1. **0 ms:**
   - The item presses in (scales to 0.97, 80 ms), its underline flashes white, and a small burst of square motes (bots) jumps out from the pointer.
   - The click sound plays (the grander "start" sound for NEW GAME and CONTINUE).
2. **0–700 ms:** **Wick jumps up and says hello.** The hello sequence plays, a speech bubble pops above Wick ("Hello!", or a short line for the item: "Let's go!", "Who's there?"), and Wick's hello chirp plays at the jump's apex.
3. **About 550 ms:** **the screen slides.** The menu column and the front layer slide out to the left while the next screen slides in from the right (400 ms, ease-in-out). The middle and back layers slide less than the front, so the slide itself has depth. A soft whoosh plays.
4. Clicking or pressing Enter again during the hello skips straight to the slide.
5. **Back** (Escape, or a ‹ Back on the next screen) slides the other way with the back sound.

## 5. Parallax

- The pointer's offset from the screen centre moves each layer. Horizontal: back ±0.8%, middle ±2.5%, front ±5% of the width; vertical: half that.
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
- **Art files:** each layer ships as a WebP at 2560 px wide (about 300–500 KB each) with a 1440 px variant for phones; the title shows a dark gradient and the wordmark until they load, then fades them in.
- **Stand-ins until the art lands:**
  - Layers cut from `world-outpost813` and other approved illustrations, plus a code-drawn glow for the Celestial.
  - Wick's welcome mark, with a CSS bounce, in place of the run and hello frames.
- **The DC home screen's jobs** (name, host, join, resume, the character library) move into the sub-screens; nothing they do is lost.

## 9. Pass criteria

1. No header bar; the title and menu read over the art at every window size from 1280 × 720 to 2560 × 1440, and on a phone in portrait.
2. Hover, keyboard focus and touch all move Wick; Enter and click both press.
3. The press → hello → slide sequence finishes in under 1.1 s and can be skipped.
4. Reduce motion removes all parallax and running.
5. No sound plays before the first key press or click; after it, every button in the game clicks.
