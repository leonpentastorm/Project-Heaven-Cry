// The map's hover (the fight's grid): which tile the pointer is on, told to the screen at most once a frame and never
// while the map is moving under the pointer. Found by Leon on live 0.25.0: while a unit walks or the camera glides, the
// map slides under a pointer that stands still, the browser says the pointer "entered" tile after tile, and every tile
// entered re-rendered the whole combat screen (its renderVals, the template, the camera's sync): the frame rate halved
// exactly when the motion had to be smooth (docs/design/handoffs/map-hover-performance.md).
//
// The rules here:
//   - A pointer-enter on a tile only notes the tile and the pointer's place; nothing is rendered in the event.
//   - Once a frame (requestAnimationFrame) the tile under the pointer is resolved, if the map is still: the camera is not
//     gliding, easing or being dragged, nothing scrolled it in the last moment, and the effects queue has nothing left to
//     play (a walk, an attack). While the map moves, the hovered tile stays as it was (frozen) and the frame loop waits;
//     when the motion ends the tile under the pointer is resolved ONCE (the hit test at the pointer's last place).
//   - An enter whose pointer did not move (its client coordinates are the last ones seen) was made by the map moving, not
//     by the player: it waits for the same frame loop, so the map's own motion can never ask for a render on its own.
//   - A scripted event (not isTrusted: the jsdom tests) is the hover itself: told at once, as before.
//   - Leaving the grid clears the hover at once and drops whatever was waiting.
// The screen keeps `state.hover` as before: what a hover shows when the map is still (the path and its AP cost, the
// legal tiles, the chips, the tooltip, the click target) is unchanged.
import { activeCamera } from './cameraView';
import { fxBusyUntil } from './fx/play';

/** What the screen gives: its current hovered tile and how to change it (a setState). */
export interface HoverHost { hovered(): string | null; setHover(key: string | null): void }

/** A short quiet after the last scroll of the map's window before a hover is resolved (ms): a wheel or a drag that has
 *  just stopped moving the map. */
export const SCROLL_QUIET_MS = 90;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const raf: (f: () => void) => number = typeof requestAnimationFrame === 'function' ? (f) => requestAnimationFrame(f) : (f) => setTimeout(f, 16) as unknown as number;
const unraf: (id: number) => void = typeof cancelAnimationFrame === 'function' ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id);

/** Tile key of an element of the grid this module has seen (the tile buttons the screen's handlers ran for). */
const KEY_OF = new WeakMap<Element, string>();
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** The tile key from a tile button's label ("C7 · …" is "2,6"), for a tile the pointer never entered. */
export function keyFromLabel(label: string | null | undefined): string | null {
  const m = /^([A-Z]{1,2})(\d+)\b/.exec(String(label || '')); if (!m) return null;
  const x = m[1].length === 1 ? COLS.indexOf(m[1]) : (COLS.indexOf(m[1][0]) + 1) * 26 + COLS.indexOf(m[1][1]);
  return x >= 0 ? x + ',' + (Number(m[2]) - 1) : null;
}

/** What counts as the map moving now (each piece testable): the camera's own motion, a scroll of its window a moment
 *  ago, the effects queue playing. */
export interface Motion { camera: boolean; scrolledAgo: number; fxBusy: boolean }
export function motionNow(): Motion {
  const cam = activeCamera();
  let busy = false; try { busy = fxBusyUntil() > now() + 1; } catch { busy = false; }
  return { camera: !!cam && cam.moving(), scrolledAgo: cam ? now() - cam.scrolledAt() : Infinity, fxBusy: busy };
}
export const isMoving = (m: Motion) => m.camera || m.fxBusy || m.scrolledAgo < SCROLL_QUIET_MS;
// For the browser suites and the probe: what the hover sees as motion now.
if (typeof window !== 'undefined') (window as any).__phcMapMotion = () => motionNow();

/** The hover of one map. One per screen instance; `host` is the screen. */
export class MapHover {
  private host: HoverHost;
  /** The tile the last enter named (the fallback when the hit test finds nothing it knows). */
  private cand: string | null = null;
  /** The pointer's last place on the map (client px), and whether a resolve is waiting. */
  private pt: { x: number; y: number } | null = null;
  private waiting = false; private frame = 0;
  /** How many times the screen was told (tests and the probe read it). */
  told = 0;
  /** For the tests: what counts as moving (default: motionNow), and the hit test (default: elementFromPoint). */
  moving: () => boolean = () => isMoving(motionNow());
  hit: (x: number, y: number) => Element | null = (x, y) => (typeof document !== 'undefined' && document.elementFromPoint ? document.elementFromPoint(x, y) : null);
  constructor(host: HoverHost) { this.host = host; }

  /** The pointer entered a tile (key; null: something on the map that is no tile, the axis labels). */
  enter(key: string | null, e?: { isTrusted?: boolean; clientX?: number; clientY?: number; currentTarget?: any } | null) {
    if (e && e.currentTarget && key) KEY_OF.set(e.currentTarget as Element, key);
    // a scripted event (the tests): the hover at once, as it always was
    if (!e || !e.isTrusted) { this.cancel(); this.tell(key); return; }
    this.cand = key;
    this.pt = { x: e.clientX ?? 0, y: e.clientY ?? 0 };
    this.wait();
  }
  /** The pointer left the map: the hover goes at once, and nothing waits. */
  leave() { this.cancel(); this.cand = null; this.pt = null; this.tell(null); }
  /** Drop a waiting resolve (the screen went away, the pointer left). */
  cancel() { if (this.frame) unraf(this.frame); this.frame = 0; this.waiting = false; }
  private wait() { if (this.waiting) return; this.waiting = true; this.frame = raf(() => this.tick()); }
  private tick() {
    this.frame = 0;
    if (!this.waiting) return;
    if (this.moving()) { this.frame = raf(() => this.tick()); return; } // still moving: look again next frame
    this.waiting = false;
    this.tell(this.resolve());
  }
  /** The tile under the pointer's last place: the hit test, else the last tile entered. */
  resolve(): string | null {
    if (!this.pt) return this.cand;
    const el = this.hit(this.pt.x, this.pt.y);
    if (!el || typeof (el as any).closest !== 'function') return this.cand;
    if (!el.closest('.phc-grid')) return null; // off the map now (the window moved away from under the pointer)
    const tile = el.closest('button.phc-tok');
    if (!tile) return null; // a label, a gap: no tile
    return KEY_OF.get(tile) ?? keyFromLabel(tile.getAttribute('aria-label')) ?? this.cand;
  }
  private tell(key: string | null) { if (this.host.hovered() === key) return; this.told++; this.host.setHover(key); }
}

/** A small cache for what a hover shows (the route to the hovered tile, its preview): asked again for the same tile in
 *  the same game state, the answer is the one worked out before. The state object is the game version (the store gives a
 *  new one after every action), so a cache never outlives the state it was made from. */
export class HoverMemo {
  private g: unknown = null; private m = new Map<string, unknown>();
  /** How many times the work was done (the tests read it). */
  runs = 0;
  get<T>(g: unknown, parts: (string | number | null | undefined)[], fn: () => T): T {
    if (g !== this.g) { this.g = g; this.m.clear(); }
    const k = parts.map((p) => (p == null ? '' : String(p))).join('|');
    if (this.m.has(k)) return this.m.get(k) as T;
    const v = fn(); this.runs++;
    if (this.m.size > 256) this.m.clear();
    this.m.set(k, v); return v;
  }
}

/** The map hover and the hover cache of a screen's logic (a DCLogic with `state.hover`), made on first use. */
export function hoverFor(logic: { state: any; setState(p: any): void; _mapHover?: MapHover }): MapHover {
  return logic._mapHover || (logic._mapHover = new MapHover({ hovered: () => logic.state.hover ?? null, setHover: (key) => logic.setState({ hover: key }) }));
}
export function hoverMemo(logic: { _hoverMemo?: HoverMemo }): HoverMemo { return logic._hoverMemo || (logic._hoverMemo = new HoverMemo()); }
