// The floating Music and Memory buttons (UI pass, docs/design/ui-pass-shell.md section 7): they sit over the play
// screen's bottom-left corner, so at rest they are see-through (Settings › Display › opacity, 55% by default) and come
// up to full when the pointer is near (120 px), when they have keyboard focus, or while their panel is open. With
// fading off they stay at the chosen opacity (100% = solid, as before). A faded button still clicks.
// Combat clarity (Leon, 9 Nov 2026: "make the button slide in and out, memory and song display hide each other"): at
// rest they also slide down to a tab at the screen's edge (Settings › Display › slide; off under reduced motion) and
// slide back up when the pointer comes near, on focus or while open. The two share one dock: while one is out (its
// name showing on hover, its panel open), the other slides away, so the song's title never runs under the ◈ button and
// the memory and the music panel are never open together.
import React from 'react';
import { uiPrefs, onUiPrefs, reducedMotion } from './sfx';

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
// A tap (touch has no hover): where it landed counts as the pointer, so a tap on a tucked tab brings it out.
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => { px = e.clientX; py = e.clientY; for (const f of moved) f(); }, { passive: true, capture: true });

/** The two floating buttons. */
export type FloatKey = 'music' | 'memory';
/** How far a tucked button slides down (px): from bottom 16 a 40 px button keeps its top 20 px on screen, a tab. */
export const TUCK_PX = 36;
/** A button's place: out (full, where it stands), tucked (slid down to its tab at rest), away (the other is out) or
 *  lifted (the other shows a wide label it can't hide: the music's "Click to start the music"; this one steps up above
 *  it, still there to click). */
export type FloatPlace = 'out' | 'tucked' | 'away' | 'lifted';
/** How far a lifted button steps up (px): above the other's 40 px button and its gap. */
export const LIFT_PX = 48;
/** Where a floating button is: away while the other one is out; lifted while the other is wide; else tucked at rest
 *  (when sliding is on), else out. Pure (tests). */
export function floatPlace(me: FloatKey, outKey: FloatKey | null, slide: boolean, near: boolean, focused: boolean, open: boolean, expanded: boolean, wideKey: FloatKey | null = null): FloatPlace {
  if (outKey && outKey !== me && !open) return 'away';
  if (wideKey && wideKey !== me && !open) return 'lifted';
  if (open || focused || expanded || near || !slide) return 'out';
  return 'tucked';
}
/** The transform and transition for a place (reduced motion: no slide, the away button only fades; a lifted one still
 *  steps up, at once, so it is never under the other's label). Pure (tests). */
export function floatMotion(place: FloatPlace, reduced: boolean): { transform: string; transition: string } {
  if (reduced) return { transform: place === 'lifted' ? 'translateY(-' + LIFT_PX + 'px)' : 'none', transition: 'opacity 150ms ease' };
  if (place === 'lifted') return { transform: 'translateY(-' + LIFT_PX + 'px)', transition: 'opacity 150ms ease, transform 240ms cubic-bezier(.2,.8,.2,1)' };
  const y = place === 'tucked' ? TUCK_PX : place === 'away' ? 72 : 0;
  return { transform: 'translateY(' + y + 'px)', transition: 'opacity 150ms ease, transform 240ms cubic-bezier(.2,.8,.2,1)' };
}

// ---------- the shared dock: which one is out ----------
let outKey: FloatKey | null = null, wideKey: FloatKey | null = null;
const outSubs = new Set<() => void>();
/** Say whether a floating button is out (expanded or open). The last one out wins; going in clears only its own. */
export function setFloatOut(key: FloatKey, on: boolean) {
  const was = outKey;
  if (on) outKey = key; else if (outKey === key) outKey = null;
  if (was !== outKey) for (const f of outSubs) f();
}
/** Say whether a floating button shows a wide label of its own accord (not the pointer's doing): the other steps up. */
export function setFloatWide(key: FloatKey, on: boolean) {
  const was = wideKey;
  if (on) wideKey = key; else if (wideKey === key) wideKey = null;
  if (was !== wideKey) for (const f of outSubs) f();
}
export const floatOut = () => outKey;
/** Subscribe to the dock (returns the unsubscribe). */
export const onFloatOut = (f: () => void) => { outSubs.add(f); return () => { outSubs.delete(f); }; };

/** The style for a floating button: its opacity, its slide, and a short ease. key and expanded (its label showing) put
 *  it in the shared dock; without them it only fades (as before the slide). */
export function useFloatStyle(ref: React.RefObject<HTMLElement | null>, open: boolean, key?: FloatKey, expanded = false, wide = false): React.CSSProperties & { place?: FloatPlace } {
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
  const [, dock] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => onFloatOut(dock), []);
  const out = open || expanded;
  React.useEffect(() => { if (key) setFloatOut(key, out); }, [key, out]);
  React.useEffect(() => { if (key) setFloatWide(key, wide); }, [key, wide]);
  React.useEffect(() => () => { if (key) { setFloatOut(key, false); setFloatWide(key, false); } }, [key]);
  const p = uiPrefs(), opacity = floatOpacity((p.float ?? 55) / 100, p.floatFade !== false, near, focused, open);
  if (!key) return { opacity, transition: 'opacity 150ms ease' };
  const place = floatPlace(key, outKey, p.floatSlide !== false, near, focused, open, expanded, wideKey), mo = floatMotion(place, reducedMotion());
  return { opacity: place === 'away' ? 0 : opacity, ...mo, pointerEvents: place === 'away' ? 'none' : undefined, place };
}
