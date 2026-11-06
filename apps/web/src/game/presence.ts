// In-and-out animation for React overlays (the transitions pass). usePresence keeps the last value on screen for a
// moment after it goes away, flagged closing, so the element can play its out animation (global CSS in main.tsx:
// .phc-a-right / -left / -drop / -rise / -pop / -fade, plus .phc-closing while it leaves).
import React from 'react';
import { reducedMotion } from './sfx';

/** How long the combat-in screen transition runs (App.tsx); music.tsx waits this long before the fight music fades
 *  in, and turnIntro.tsx holds the first turn banner until it is over. */
export const COMBAT_IN_MS = 950;

/** How long an overlay stays mounted after it closes (matches the .phc-closing animations). */
export const CLOSE_MS = 200;

/** value: what to show (null / undefined / false = nothing). Returns what to render and whether it is leaving. */
export function usePresence<T>(value: T | null | undefined | false, ms = CLOSE_MS): { shown: T | null; closing: boolean } {
  const live = value === null || value === undefined || value === false ? null : value;
  const last = React.useRef<T | null>(live);
  const [closing, setClosing] = React.useState(false);
  if (live !== null) last.current = live;
  const had = last.current !== null;
  React.useEffect(() => {
    if (live !== null) { setClosing(false); return; }
    if (!had) return;
    setClosing(true);
    const t = setTimeout(() => { last.current = null; setClosing(false); }, reducedMotion() ? 150 : ms);
    return () => clearTimeout(t);
  }, [live === null]);
  if (live !== null) return { shown: live, closing: false };
  return { shown: closing || had ? last.current : null, closing: had };
}

/** The class for an element in and out: base ('phc-a-drop' …) plus 'phc-closing' while it leaves. */
export const presenceCls = (base: string, closing: boolean) => base + (closing ? ' phc-closing' : '');
