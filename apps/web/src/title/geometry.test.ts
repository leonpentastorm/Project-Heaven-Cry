import { describe, it, expect } from 'vitest';
import { titleGeometry, layerShift, LAYERS, SAFE, CANVAS, PHONE_CX } from './geometry';

const SIZES: [number, number][] = [[1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [900, 800], [390, 844], [3440, 1440], [768, 1024]];

describe('title art geometry', () => {
  it('covers the window with the safe rect and never shows an edge when the layers slide', () => {
    for (const [vw, vh] of SIZES) {
      const g = titleGeometry(vw, vh);
      // The window, in canvas px, stays inside the safe rect.
      const x0 = -g.left / g.s, y0 = -g.top / g.s, x1 = x0 + vw / g.s, y1 = y0 + vh / g.s;
      expect(x0).toBeGreaterThanOrEqual(SAFE[0] - 1e-6); expect(y0).toBeGreaterThanOrEqual(SAFE[1] - 1e-6);
      expect(x1).toBeLessThanOrEqual(SAFE[2] + 1e-6); expect(y1).toBeLessThanOrEqual(SAFE[3] + 1e-6);
      expect(g.w).toBeCloseTo(CANVAS[0] * g.s); expect(g.h).toBeCloseTo(CANVAS[1] * g.s);
      for (const [, d] of LAYERS) {
        const [mx, my] = layerShift(g, d);
        expect(mx / g.s).toBeLessThanOrEqual(246 + 1e-6); expect(my / g.s).toBeLessThanOrEqual(69 + 1e-6);
      }
    }
  });
  it('16:9 shows exactly the safe rect; a phone shows the phone crop', () => {
    const wide = titleGeometry(1920, 1080);
    expect(wide.cx).toBeCloseTo(2048); expect(wide.cy).toBeCloseTo(1152);
    const phone = titleGeometry(390, 844);
    expect(phone.cx).toBeCloseTo(PHONE_CX);
  });
});
