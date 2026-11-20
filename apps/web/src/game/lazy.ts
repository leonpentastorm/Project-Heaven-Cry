// A module loaded on demand (the client load lane, 0.33): the title and the boot chunk name what they need of the
// engine-side code through one of these, so the engine and the game's data stay out of the boot chunk.
import React from 'react';

export interface Lazy<T> { /** The module if it is in, else null. */ now(): T | null; /** Load it (once; a failed load may be tried again). */ load(): Promise<T> }
export function lazyModule<T>(imp: () => Promise<T>): Lazy<T> {
  let mod: T | null = null, p: Promise<T> | null = null;
  return {
    now: () => mod,
    load: () => (mod ? Promise.resolve(mod) : (p ||= imp().then((m) => (mod = m), (e) => { p = null; throw e; }))),
  };
}
/** The module, rendering again once it is in (null until then). */
export function useLazy<T>(l: Lazy<T>): T | null {
  const [, bump] = React.useReducer((x: number) => x + 1, 0);
  const m = l.now();
  React.useEffect(() => { if (!m) { let live = true; l.load().then(() => { if (live) bump(); }, (e) => console.error(e)); return () => { live = false; }; } }, [m]);
  return m;
}
/** Call into the module now when it is in (inside the click, so a file picker it opens keeps the click's permission),
 *  else once it has loaded. */
export function withLazy<T>(l: Lazy<T>, f: (m: T) => void) { const m = l.now(); if (m) f(m); else l.load().then(f, (e) => console.error(e)); }
