// The visible part of a page column, for an overlay drawn over it with position: fixed (the reward panel and its bar,
// the vow pop-up, the turn card). One rule (0.33): the box is the element's rectangle clipped to the window; when the
// visible part is under `min` px wide or high, or the element is off the screen (a window under 1000 px wide stacks the
// columns, and the middle one can start below the fold), the overlay takes the window instead, so it is never drawn
// where nobody can see or press it.
export interface Box { left: number; top: number; width: number; height: number }

/** The window's box. */
export const windowBox = (): Box => ({ left: 0, top: 0, width: typeof innerWidth === 'number' ? innerWidth : 1280, height: typeof innerHeight === 'number' ? innerHeight : 720 });

/** A rectangle clipped to the window, or the window when too little of it shows (see above). */
export function visibleBox(r: { left: number; top: number; right: number; bottom: number } | null | undefined, min = 200): Box {
  const win = windowBox();
  if (!r) return win;
  const top = Math.max(0, r.top), bottom = Math.min(win.height, r.bottom), left = Math.max(0, r.left), right = Math.min(win.width, r.right);
  if (right - left < min || bottom - top < min) return win;
  return { left, top, width: right - left, height: bottom - top };
}
