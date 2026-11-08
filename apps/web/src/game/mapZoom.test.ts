// The combat map's size (game/mapZoom.ts).
import { describe, expect, it } from 'vitest';
import { normaliseZoom, stepZoom, autoFit, zoomAction, zoomLabel, clampZoom, ZOOM_MIN, ZOOM_MAX, AUTO_MIN, AUTO_MIN_NARROW } from './mapZoom';

describe('the map size', () => {
  it('normalises a stored value', () => {
    expect(normaliseZoom(null)).toEqual({ mode: 'auto', scale: 1 });
    expect(normaliseZoom({ mode: 'manual', scale: 9 })).toEqual({ mode: 'manual', scale: ZOOM_MAX });
    expect(normaliseZoom({ mode: 'weird', scale: 'x' })).toEqual({ mode: 'auto', scale: 1 });
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
  });
  it('steps from any size to the next step, and stops at the ends', () => {
    expect(stepZoom(1, 1)).toBe(1.1); expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(0.93, 1)).toBe(1); expect(stepZoom(0.93, -1)).toBe(0.9);
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX); expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN);
  });
  it('Auto fits both ways, grows past 100% on big screens, and keeps a floor', () => {
    const natW = 48 * 16 + 36, natH = 48 * 12 + 36;
    expect(autoFit(804, 9999, natW, natH)).toBe(1);
    expect(autoFit(3000, 1200, natW, natH)).toBe(Math.floor((1200 / natH) * 100) / 100); // 4K: about 1.96
    expect(autoFit(99999, 99999, natW, natH)).toBe(ZOOM_MAX);
    expect(autoFit(100, 100, natW, natH)).toBe(AUTO_MIN);
    expect(autoFit(100, 100, natW, natH, true)).toBe(AUTO_MIN_NARROW);
  });
  it('a step from Auto starts at the size Auto showed; Auto and 100% are one click', () => {
    expect(zoomAction({ mode: 'auto', scale: 1 }, 1.37, 'in')).toEqual({ mode: 'manual', scale: 1.4 });
    expect(zoomAction({ mode: 'manual', scale: 1.4 }, 1.4, 'out')).toEqual({ mode: 'manual', scale: 1.25 });
    expect(zoomAction({ mode: 'manual', scale: 0.6 }, 0.6, 'auto').mode).toBe('auto');
    expect(zoomAction({ mode: 'auto', scale: 1 }, 1.7, 'reset')).toEqual({ mode: 'manual', scale: 1 });
    expect(zoomLabel(1.25)).toBe('125%');
  });
});
