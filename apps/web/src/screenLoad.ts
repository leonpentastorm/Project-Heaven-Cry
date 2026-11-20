// The bundle split by screen (the outside code review's performance work): each screen's code and template is its own
// chunk (src/screenChunks/*), loaded the first time it is needed or ahead of time by the preloader (game/preload.ts
// warmNext: the screens a player can reach next). The title is in the main bundle: it is the first thing drawn.
// App.tsx keeps the screen it shows until the next one's chunk is in, so a screen change never flashes an empty page.
import type React from 'react';
import type { Screen } from './game/store';
import { lazyModule } from './game/lazy';

type Comp = React.ComponentType<any>;
export type ChunkScreen = Exclude<Screen, 'home' | 'run'>;
const LOAD: Record<ChunkScreen, () => Promise<{ default: Comp }>> = {
  create: () => import('./screenChunks/create'),
  room: () => import('./screenChunks/room'),
  main: () => import('./screenChunks/main'),
  combat: () => import('./screenChunks/combat'),
  levelup: () => import('./screenChunks/levelup'),
  ultimate: () => import('./screenChunks/ultimate'),
};
/** Every screen chunk (the preloader warms them all a while after the load event: a page left open across a release
 *  never needs a file that is gone to change screen). */
export const CHUNK_SCREENS = Object.keys(LOAD) as ChunkScreen[];
/** The chunk a screen lives in: 'run' is the play screen (store.go), the title has none. */
export const chunkOf = (s: Screen): ChunkScreen | null => (s === 'home' ? null : s === 'run' ? 'main' : s);

const done = new Map<ChunkScreen, Comp>(), pending = new Map<ChunkScreen, Promise<Comp>>();
/** The screen's component if its chunk is in (the title: null, App draws it), else undefined. */
export function loadedScreen(s: Screen): Comp | null | undefined {
  const c = chunkOf(s);
  return c ? done.get(c) : null;
}
/** Load a screen's chunk (once; a failed load may be tried again). */
export function loadScreen(s: Screen): Promise<Comp | null> {
  const c = chunkOf(s);
  if (!c) return Promise.resolve(null);
  const hit = done.get(c); if (hit) return Promise.resolve(hit);
  let p = pending.get(c);
  if (!p) {
    p = LOAD[c]().then((m) => { done.set(c, m.default); pending.delete(c); return m.default; }, (e) => { pending.delete(c); throw e; });
    pending.set(c, p);
  }
  return p;
}

// The Proving Ground's panel (game/sandbox.tsx, the tools) is its own chunk too: it is drawn over the play and fight
// screens only while the room is in the Proving Ground. App.tsx waits for it as for a screen's chunk, so the tools never
// come in after the screen they sit on.
type PanelComp = React.ComponentType<{ game: any; meId: string; isHost: boolean; screen: string }>;
let sandboxPanel: PanelComp | null = null, sandboxP: Promise<PanelComp> | null = null;
export const loadedSandbox = () => sandboxPanel;
export function loadSandbox(): Promise<PanelComp> {
  if (sandboxPanel) return Promise.resolve(sandboxPanel);
  return (sandboxP ||= import('./game/sandbox').then((m) => (sandboxPanel = m.SandboxPanel), (e) => { sandboxP = null; throw e; }));
}

// The room's overlays (game/roomLayer.tsx: the music, the effects layer, the turn banners and the rest App draws over a
// room's screens) are their own chunk too (the client load lane, 0.33: they read the engine, the boot chunk does not).
// App waits for them before it shows a room's screen, as for a screen's chunk.
export const ROOM_LAYER = lazyModule(() => import('./game/roomLayer'));
