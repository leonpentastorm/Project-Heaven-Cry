// @vitest-environment jsdom
// The painted gear icons on screen (art/style-guide/gear-icons.md): the Proving Ground's gear list draws an item's painted
// icon when the delivery has one, and the monoline icon when not, through the one resolver (gearIcons.ts).
import { describe, expect, it, afterEach } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { GearIcon } from './sandbox';
import { setGearArt } from './gearIcons';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => setGearArt(null));
function draw(id: string, size?: number): HTMLImageElement | null {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(createElement(GearIcon, { id, size })));
  const img = el.querySelector('img');
  return img;
}

describe('GearIcon (jsdom)', () => {
  it('an item with a painted icon renders it, untinted, in the old box', () => {
    const img = draw('service_pistol', 32)!;
    expect(img.getAttribute('src')).toMatch(/^\/assets\/gear-service_pistol\.webp/);
    expect(img.getAttribute('width')).toBe('32');
    expect(img.style.filter || '').toBe(''); expect(img.style.maskImage || '').toBe('');
  });
  it('an item without one renders the monoline fallback', () => {
    setGearArt({}); // as if the delivery had no painting for it
    const img = draw('service_pistol')!;
    expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    expect(img.getAttribute('width')).toBe('24');
  });
  it('an item with neither draws nothing', () => {
    expect(draw('no_such_item')).toBeNull();
  });
});
