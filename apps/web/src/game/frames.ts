// A page that draws no frames (0.33 outside playtest, five reports: the sheet's STATUS, PERKS and GEAR tabs blank, an
// action tab's panel empty after a switch, a chooser clipped under the level-up header). Some browsers keep a page
// "visible" while drawing nothing: a browser pane that is open but not shown, a window an automation tool drives
// in the background. There requestAnimationFrame never fires and every CSS animation stays at its first frame, so
// whatever slides or fades in from opacity 0 (a tab's content, a dialog, the turn box) stays invisible or half in
// place. The game's entrance animations are decoration: when no frame has been drawn for NO_FRAME_MS while the page's
// timers still run, <html> gets `phc-noframes` and every animation and transition is off (each element shows its end
// state at once); the first frame drawn again takes the class off. One watcher for the whole game, started by main.tsx.
// nextFrame() is requestAnimationFrame with a timer behind it, for code that must run its step whether or not a frame
// comes (a box read after a layout change).

/** How long with no frame drawn, while the timers still run, before the animations are turned off (ms). Well above any
 *  long task a busy machine makes (a frame late by a second is a slow page, not one that draws nothing). */
export const NO_FRAME_MS = 2000;
/** How often the watcher looks (ms). */
const LOOK_MS = 500;
export const NO_FRAMES_CLASS = 'phc-noframes';
/** The CSS that turns every animation and transition off while no frame is drawn (the element shows its end state). */
export const NO_FRAMES_CSS = 'html.' + NO_FRAMES_CLASS + ' *,html.' + NO_FRAMES_CLASS + ' *::before,html.' + NO_FRAMES_CLASS + ' *::after{animation:none!important;transition:none!important}';

let lastFrame = 0, asked = false, started = false;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Whether the page has drawn a frame lately (false: it is drawing none; the animations are off). */
export const drawingFrames = () => !(typeof document !== 'undefined' && !!document.documentElement && !!document.documentElement.classList && document.documentElement.classList.contains(NO_FRAMES_CLASS));

/** Decide from the times alone (for the tests): off when nothing was drawn for NO_FRAME_MS. */
export const framesStalled = (t: number, last: number) => t - last >= NO_FRAME_MS;

/** Start the watcher (once). */
export function watchFrames() {
  if (started || typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  started = true; lastFrame = now();
  const root = document.documentElement;
  const drawn = () => { asked = false; lastFrame = now(); if (root.classList.contains(NO_FRAMES_CLASS)) root.classList.remove(NO_FRAMES_CLASS); };
  const look = () => {
    // a page the browser says is hidden is a background tab: the animations wait for it, and nothing is changed
    if (document.visibilityState === 'visible' && framesStalled(now(), lastFrame) && !root.classList.contains(NO_FRAMES_CLASS)) root.classList.add(NO_FRAMES_CLASS);
    if (!asked) { asked = true; requestAnimationFrame(drawn); }
    setTimeout(look, LOOK_MS);
  };
  const st = document.createElement('style'); st.id = 'phc-noframes'; st.textContent = NO_FRAMES_CSS; document.head.appendChild(st);
  requestAnimationFrame(drawn); asked = true;
  setTimeout(look, LOOK_MS);
}

/** requestAnimationFrame, or a timer when no frame comes within `ms`: `fn` runs once either way. Returns a cancel. */
export function nextFrame(fn: () => void, ms = 100): () => void {
  let done = false, raf = 0;
  const run = () => { if (done) return; done = true; if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf); clearTimeout(t); fn(); };
  const t = setTimeout(run, ms);
  if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(run);
  return () => { done = true; clearTimeout(t); if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf); };
}
