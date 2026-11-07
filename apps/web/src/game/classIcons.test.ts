// @vitest-environment jsdom
// Class emblems: every class in the data pack has one, and every emblem is well-formed SVG.
import { describe, expect, it } from 'vitest';
import classes from '../../../../data/classes.json';
import { CLASS_ICON_PATHS, CORE_INK, classCore, classIconSvg, classIconUri } from './classIcons';

const base = (classes as any).base as { id: string; core: 'body' | 'mind' | 'soul' }[];
const advanced = (classes as any).advanced as { id: string; parents: string[] }[];
const coreOf = Object.fromEntries(base.map((c) => [c.id, c.core]));
const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');

describe('class emblems', () => {
  it('every base and advanced class has an emblem, and no emblem is for a class that does not exist', () => {
    const ids = [...base, ...advanced].map((c) => c.id);
    for (const id of ids) expect(CLASS_ICON_PATHS[id], id).toBeTruthy();
    expect(Object.keys(CLASS_ICON_PATHS).sort()).toEqual([...ids].sort());
  });
  it('base classes take their own core; advanced classes their first parent\'s, with a double frame of its shape', () => {
    for (const c of base) {
      expect(classCore(c.id)).toBe(c.core);
      expect(CLASS_ICON_PATHS[c.id].frame).toBe(c.core);
      expect(CLASS_ICON_PATHS[c.id].double).toBeFalsy();
    }
    for (const c of advanced) {
      expect(classCore(c.id)).toBe(coreOf[c.parents[0]]);
      expect(CLASS_ICON_PATHS[c.id].frame).toBe(coreOf[c.parents[0]]);
      expect(CLASS_ICON_PATHS[c.id].double).toBe(true);
    }
  });
  it('every emblem parses as SVG and is drawn in its core ink by default', () => {
    for (const id of Object.keys(CLASS_ICON_PATHS)) {
      const svg = classIconSvg(id);
      const doc = parse(svg);
      expect(doc.getElementsByTagName('parsererror').length, id).toBe(0);
      expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(doc.documentElement.getAttribute('stroke')).toBe(CORE_INK[classCore(id)!]);
      for (const p of Array.from(doc.getElementsByTagName('path'))) expect(p.getAttribute('d'), id).toMatch(/^M[\d.\s\-MLHVCQAZhvlmaz]+$/);
      expect(decodeURIComponent(classIconUri(id).replace('data:image/svg+xml,', ''))).toBe(svg);
    }
  });
  it('a custom colour and size apply; an unknown id gets a neutral fallback', () => {
    expect(classIconSvg('mage', '#FFFFFF', 64)).toContain('stroke="#FFFFFF"');
    expect(classIconSvg('mage', undefined, 64)).toContain('width="64"');
    const fb = classIconSvg('no_such_class');
    expect(classCore('no_such_class')).toBeUndefined();
    expect(parse(fb).getElementsByTagName('parsererror').length).toBe(0);
    expect(fb).toContain('stroke="#A3AEC2"');
  });
});
