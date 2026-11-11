// The combat map's size. The default ('auto') is the usual size: the tiles are as big as a 16 x 11 map's were when it was
// fitted to the window, and a bigger map scrolls in its window (the camera: game/camera.ts usualScale, cameraView.ts).
// Manual is a size the player picks (− / + buttons, the − and + keys, Ctrl or ⌘ with the mouse wheel over the map). A
// per-browser preference (localStorage), never game state. Pure functions here (tested in mapZoom.test.ts);
// screens/combat.js applies them. autoFit is the plain fit-to-room arithmetic the tests keep.
export type ZoomMode = 'auto' | 'manual';
export interface MapZoom { mode: ZoomMode; scale: number }
export const MAP_ZOOM_KEY = 'phc.mapZoom';
export const DEFAULT_ZOOM: MapZoom = { mode: 'auto', scale: 1 };
/** Manual sizes, smallest to largest. Auto stays inside the same range. */
export const STEPS = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2, 2.25, 2.5];
export const ZOOM_MIN = STEPS[0], ZOOM_MAX = STEPS[STEPS.length - 1];
/** Auto never goes below these (narrow windows fit the width only and can't go as small). */
export const AUTO_MIN = 0.5, AUTO_MIN_NARROW = 0.6;

export const clampZoom = (z: number) => Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Number(z) || 1)) * 100) / 100;
export function normaliseZoom(x: any): MapZoom { return { mode: x?.mode === 'manual' ? 'manual' : 'auto', scale: clampZoom(x?.scale ?? 1) }; }

/** One step bigger (dir 1) or smaller (dir −1) from any size: the next step past it, never stuck between two. */
export function stepZoom(cur: number, dir: 1 | -1): number {
  const z = clampZoom(cur);
  if (dir > 0) return STEPS.find((s) => s > z + 0.001) ?? ZOOM_MAX;
  return [...STEPS].reverse().find((s) => s < z - 0.001) ?? ZOOM_MIN;
}
/** The Auto size: the largest that fits both ways, inside the range (floored to a whole percent so it never jitters). */
export function autoFit(availW: number, availH: number, natW: number, natH: number, narrow = false): number {
  const fit = Math.min(availW / natW, availH / natH);
  const z = Math.max(narrow ? AUTO_MIN_NARROW : AUTO_MIN, Math.min(ZOOM_MAX, Number.isFinite(fit) ? fit : 1));
  return Math.floor(z * 100) / 100;
}
/** What a control does to the preference. A step from Auto starts at the size Auto had chosen. */
export function zoomAction(z: MapZoom, shown: number, what: 'in' | 'out' | 'auto' | 'reset'): MapZoom {
  if (what === 'auto') return { mode: 'auto', scale: z.scale };
  if (what === 'reset') return { mode: 'manual', scale: 1 };
  return { mode: 'manual', scale: stepZoom(z.mode === 'auto' ? shown : z.scale, what === 'in' ? 1 : -1) };
}
export const zoomLabel = (z: number) => Math.round(z * 100) + '%';

export function readZoom(): MapZoom { try { return normaliseZoom(JSON.parse(localStorage.getItem(MAP_ZOOM_KEY) || 'null')); } catch { return { ...DEFAULT_ZOOM }; } }
export function saveZoom(z: MapZoom) { try { const n = normaliseZoom(z); if (n.mode === 'auto') localStorage.removeItem(MAP_ZOOM_KEY); else localStorage.setItem(MAP_ZOOM_KEY, JSON.stringify(n)); } catch { /* private mode: kept for this visit */ } }

/** The toolbar's CSS. */
export const ZOOM_CSS = [
  '.phc-mapzoom{display:flex;align-items:center;gap:4px;margin:0 0 6px;font-family:\'Chakra Petch\',sans-serif}',
  '.phc-mapzoom>span{font-size:11px;font-weight:700;letter-spacing:.16em;color:#A3AEC2;margin-right:4px}',
  '.phc-mapzoom button{min-height:26px;min-width:28px;padding:0 8px;border-radius:7px;border:1px solid #2E3A50;background:#10151F;color:#E7EBF3;font:700 12px/1 \'Chakra Petch\',sans-serif;cursor:pointer}',
  '.phc-mapzoom button:hover{border-color:#A3AEC2}.phc-mapzoom button:disabled{opacity:.4;cursor:default}',
  '.phc-mapzoom button[aria-pressed=true]{border-color:#FFFFFF;background:#1C2536;color:#FFFFFF}',
  '.phc-mapzoom button:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  '.phc-mapzoom .phc-mz-pct{min-width:52px}',
  '.phc-mapzoom{flex-wrap:wrap}.phc-mapzoom kbd{margin-left:4px;padding:1px 5px;border-radius:4px;border:1px solid #3B475D;color:#A3AEC2;font:700 10px/1 \'Chakra Petch\',sans-serif}',
  '.phc-mapzoom .phc-mz-whole{margin-left:8px}.phc-mapzoom>.phc-mz-hint{margin:0 0 0 8px;font-size:11px;font-weight:500;letter-spacing:0;color:#A3AEC2}',
].join('');
