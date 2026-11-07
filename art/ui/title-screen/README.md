# Project Heaven Cry — title-screen key art, Part A

Revision 3: foreground repainted from scratch in one generation to restore crisp Heavenprint faces, hands, equipment and brushwork. Retains the five-person cast, corrected forward sword grip and tall long-haired blonde elf crouching to prepare a stim, with crossbow and lantern. Three Heavenprint review-candidate layers; Wick's Part B is excluded. The delivered background master is preserved byte for byte. The foreground was revised to keep the lead and Celestial inside the phone crop.

## Files and assembly

Stack `title-back.png`, `title-mid.png`, `title-front.png`, in that order, with normal straight-alpha blending. Each is 4096 × 2304; back is opaque RGB, mid/front are RGBA. Use the central rectangle [256,144,3840,2160] as the 3584 × 2016 viewport before fitting the screen. The large canvas supplies overscan. Do not treat the two transparent images as black-backed JPEGs.

`title-screen.psd` is a real three-layer PSD at 1672 × 941, with named RGBA pixel layers and a matching merged RGB image. The repository upload service limits requests to 16 MiB; the full-size 4096 × 2304 PSD is retained in the downloadable Revision 3 package. PNG layers remain 4096 × 2304. `source-renders/` retains the original generated renders (per-layer dimensions are recorded in the manifest). The new foreground is a tightly framed 1774 × 887 native render, uniformly resized to 2000 × 1000 and placed at (2096, 1304) in the 4096 × 2304 transparent canvas. This gives the squad substantially more source detail than the earlier mostly empty render. Back and middle native renders remain 1672 × 941. None is native 4K detail. `foreground-placement.json` records the exact placement; `source-renders/foreground-repaint-prompt.txt` records the painting prompt. The PSD is an assembled raster source, not a record of hand-painted brush history.

`previews/composite-1920.jpg` shows the complete canvas; `screen-crop-1920.jpg` shows the central desktop viewport. `phone-crop.jpg` uses a 9:16 crop centred at x=68%. `safe-zones.jpg` marks the menu, overscan and phone regions. Typography appears only in `menu-readability-72px.jpg`, a technical contrast proof, not final UI typography. Use the font and layout specified in the game's design document.

## Checks

The background is painted continuously; the battlefield continues underneath the foreground squad. Eight combinations of ±246 px horizontal and ±69 px vertical shifts keep every pixel of the central viewport covered. These are 6%/3% canvas shifts, slightly more conservative than screen-width percentages. Review `parallax-extremes.jpg`; `alpha-edge-review.jpg` tests the transparent layers against dark and light grounds. The channels use straight alpha; tiny low-alpha antialiased pixels in otherwise empty areas are normal.

The separate report records white-text contrast at the sample title/menu positions. It is not a guarantee for arbitrary UI text over every pixel or every pointer position. Confirm the actual UI after wiring it in, including tilt and reduced motion. Runtime particles, interactions and responsive text/menu behaviour remain implementation work.

No new catalog entries were added: the brief reserves those for the implementer. Copy this folder into the repository, merge the checksum additions and apply the validation patch if needed. The focused validation command is `python scripts/validate_art.py --title-screen-only`. Full historical-art validation could not complete in this partial checkout; the original checks remain intact. This title-screen delivery is published on the art/briefs-complete branch.

## Rebuilding this revision

`python scripts/rebuild_title_screen.py` requires Pillow and NumPy. It preserves back/mid PNG masters, places the tightly framed foreground source, and regenerates previews plus both PSD sizes. It writes the full-size PSD to `production/title-screen-4k.psd`. After rebuilding, refresh the manifest/checksums and perform visual review before validating or publishing. Earlier foreground pixels are preserved under `art/archive/title-screen/2026-11-07-pre-repaint/`.
