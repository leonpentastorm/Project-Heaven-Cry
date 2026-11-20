// Render counts (the outside code review's performance work): how many times each part of the page has rendered,
// window.__phcRenders (App, every overlay, the Proving Ground's panel); the screens count their own
// (window.__phcRenderCount, dc/runtime.tsx). tools/perf/fight_render_probe.mjs reads them. Its own module since the
// client load lane (0.33): App and the room's overlays (game/roomLayer.tsx, its own chunk) both count through it.
import React from 'react';

const RENDERS_BY: Record<string, number> = {};
if (typeof window !== 'undefined') (window as any).__phcRenders = RENDERS_BY;
export const tally = (name: string) => { RENDERS_BY[name] = (RENDERS_BY[name] || 0) + 1; };
/** An overlay with its renders counted. */
export function counted<P extends object>(name: string, Comp: React.ComponentType<P>): React.ComponentType<P & { v: number }> {
  const W = ({ v: _v, ...p }: P & { v: number }) => { tally(name); return React.createElement(Comp, p as P); };
  W.displayName = name;
  // Memoised: an overlay renders again when its props change or App rendered for anything but a toast alone (v): never
  // for a toast alone (the outside code review's performance work).
  return React.memo(W) as any;
}
