// The floating Music and Memory buttons (UI pass, docs/design/ui-pass-shell.md section 7): they sit over the play
// screen's bottom-left corner, so at rest they are see-through (Settings › Display › opacity, 55% by default) and come
// up to full when the pointer is near (120 px), when they have keyboard focus, or while their panel is open. With
// fading off they stay at the chosen opacity (100% = solid, as before). A faded button still clicks.
import React from 'react';
import { uiPrefs, onUiPrefs } from './sfx';

export const NEAR_PX = 120;
/** The opacity for a floating button: rest (0.2–1), and whether the pointer is near, it has focus, or its panel is open. */
export function floatOpacity(rest: number, fade: boolean, near: boolean, focused: boolean, open: boolean): number {
  if (open || focused) return 1;
  if (!fade) return rest;
  return near ? 1 : rest;
}
/** Distance from a point to a rectangle (0 inside it). */
export function distToRect(x: number, y: number, r: { left: number; top: number; right: number; bottom: number }): number {
  const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
  return Math.hypot(dx, dy);
}

let px = -1e4, py = -1e4;
const moved = new Set<() => void>();
let raf = 0;
if (typeof window !== 'undefined') window.addEventListener('pointermove', (e) => {
  px = e.clientX; py = e.clientY;
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; for (const f of moved) f(); });
}, { passive: true, capture: true });

/** The style for a floating button: its opacity and a short ease. */
export function useFloatStyle(ref: React.RefObject<HTMLElement | null>, open: boolean): React.CSSProperties {
  const [near, setNear] = React.useState(false), [focused, setFocused] = React.useState(false);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => onUiPrefs(force), []);
  React.useEffect(() => {
    const f = () => { const el = ref.current; if (!el) return; const n = distToRect(px, py, el.getBoundingClientRect()) <= NEAR_PX; setNear((was) => (was === n ? was : n)); };
    moved.add(f); return () => { moved.delete(f); };
  }, []);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const on = () => setFocused(el.matches(':focus-visible') || el.contains(document.activeElement) && document.activeElement !== document.body && (document.activeElement as HTMLElement).matches(':focus-visible'));
    const off = () => setFocused(false);
    el.addEventListener('focusin', on); el.addEventListener('focusout', off);
    return () => { el.removeEventListener('focusin', on); el.removeEventListener('focusout', off); };
  });
  const p = uiPrefs();
  return { opacity: floatOpacity((p.float ?? 55) / 100, p.floatFade !== false, near, focused, open), transition: 'opacity 150ms ease' };
}
