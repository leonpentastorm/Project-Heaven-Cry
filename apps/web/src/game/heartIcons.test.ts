// Outburst 4.0 icons (game/heartIcons.ts): every feeling and module in the data has a code-drawn icon; the output is a
// clean SVG with no text; painted art wins once `npm run assets` has built it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { FEELING_PATHS, MODULE_PATHS, HEART_MARK_PATHS, COMING_SOON_SLOTS, feelingIcon, moduleIcon, heartMark, feelingUri, moduleUri, heartMarkUri,
  comingSoon, setHeartArt, hasPaintedArt, feelingKey, moduleKey, heartMarkKey } from './heartIcons';

const ids = (file: string): string[] => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../../data/${file}`, import.meta.url)), 'utf8')).items.map((i: { id: string }) => i.id);
const FEELINGS = ids('feelings.json'), MODULES = ids('soul_modules.json');
const MARKS = ['revert', 'practice', 'felt'] as const;
/** A well-formed inline icon: one <svg> of <path>s only, currentColor ink, hidden from screen readers. */
function expectCleanSvg(svg: string, size = 24) {
  expect(svg).toMatch(new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor"`));
  expect(svg).toMatch(/aria-hidden="true"/);
  expect(svg).toMatch(/<\/svg>$/);
  expect(svg).not.toMatch(/<(text|title|tspan|image|script|foreignObject)\b/);
  expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  const tags = svg.slice(svg.indexOf('>') + 1, -'</svg>'.length).match(/<[^>]+>/g) || [];
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) expect(t).toMatch(/^<path d="[MmLlHhVvCcQqAaZz0-9 .\-]+"( [a-z-]+="[^"]*")*\/>$/);
}

afterEach(() => setHeartArt(null));

describe('Outburst 4.0 icons', () => {
  it('the data has 25 feelings and 39 modules, and every one has paths', () => {
    expect(FEELINGS.length).toBe(25); expect(MODULES.length).toBe(39);
    for (const f of FEELINGS) expect(FEELING_PATHS[f]?.length, f).toBeGreaterThan(0);
    for (const m of [...MODULES, 'bolt']) expect(MODULE_PATHS[m]?.length, m).toBeGreaterThan(0);
    for (const k of MARKS) expect(HEART_MARK_PATHS[k].length, k).toBeGreaterThan(0);
  });
  it('no stray icons, and every drawing is different', () => {
    expect(Object.keys(FEELING_PATHS).sort()).toEqual([...FEELINGS].sort());
    expect(Object.keys(MODULE_PATHS).sort()).toEqual([...MODULES, 'bolt'].sort());
    const all = [...Object.values(FEELING_PATHS), ...Object.values(MODULE_PATHS), ...Object.values(HEART_MARK_PATHS)].map((p) => p.join('|'));
    expect(new Set(all).size).toBe(all.length);
  });
  it('every feeling carries the heart-knot (a solid shape); modules are lines', () => {
    for (const f of FEELINGS) expect(FEELING_PATHS[f].some((d) => d.startsWith('*')), f).toBe(true);
    for (const f of FEELINGS) expect(feelingIcon(f)).toMatch(/fill="currentColor"/);
  });
  it('outputs are clean SVG strings with no text', () => {
    for (const f of FEELINGS) expectCleanSvg(feelingIcon(f));
    for (const m of [...MODULES, 'bolt']) expectCleanSvg(moduleIcon(m, 40), 40);
    for (const k of MARKS) expectCleanSvg(heartMark(k, 64), 64);
    expectCleanSvg(feelingIcon('a_future_feeling')); expectCleanSvg(moduleIcon('a_future_module'));
    const u = decodeURIComponent(moduleUri('ricochet').replace('data:image/svg+xml,', ''));
    expect(u).toMatch(/stroke="#FFFFFF"/); expect(u).not.toMatch(/<text/);
  });
  it('painted art wins when assets.json has the key', () => {
    expect(feelingKey('rage')).toBe('feeling-rage'); expect(moduleKey('ricochet')).toBe('module-ricochet'); expect(heartMarkKey('revert')).toBe('heart-ui-revert');
    setHeartArt({ 'feeling-rage': '/assets/feeling-rage.webp', 'feeling-rage-lg': '/assets/feeling-rage-lg.webp', 'module-ricochet': '/assets/module-ricochet.webp',
      'module-at-once': '/assets/module-at-once.webp', 'heart-ui-revert': '/assets/heart-ui-revert.webp' });
    expect(feelingIcon('rage', 40)).toMatch(/^<img src="\/assets\/feeling-rage.webp" width="40" height="40" alt="" aria-hidden="true"/);
    expect(feelingIcon('rage', 128)).toMatch(/feeling-rage-lg.webp/);
    expect(moduleIcon('ricochet')).toMatch(/^<img src="\/assets\/module-ricochet.webp"/);
    expect(moduleIcon('at_once')).toMatch(/module-at-once.webp/); // a hyphenated file name matches an underscored id
    expect(heartMark('revert')).toMatch(/heart-ui-revert.webp/);
    expect(feelingUri('rage')).toBe('/assets/feeling-rage.webp'); expect(heartMarkUri('revert')).toBe('/assets/heart-ui-revert.webp');
    expect(hasPaintedArt('module-ricochet')).toBe(true); expect(hasPaintedArt('module-split')).toBe(false);
    // the rest still draw
    expect(feelingIcon('grief')).toMatch(/^<svg/); expect(moduleIcon('split')).toMatch(/^<svg/); expect(heartMark('felt')).toMatch(/^<svg/);
    setHeartArt(null);
    expect(feelingIcon('rage')).toMatch(/^<svg/);
  });
  it('COMING SOON: muted ink on a raised panel, the name escaped; the slot list is filled in', () => {
    const h = comingSoon('Grief <card>', 'unlock card illustration');
    expect(h).toMatch(/COMING SOON/); expect(h).toMatch(/#A3AEC2/); expect(h).toMatch(/#1C2536/);
    expect(h).toMatch(/Grief &lt;card&gt;/); expect(h).not.toMatch(/<card>/);
    expect(COMING_SOON_SLOTS.length).toBeGreaterThan(3);
    for (const s of COMING_SOON_SLOTS) { expect(s.slot).toBeTruthy(); expect(s.where).toBeTruthy(); expect(s.looksLike).toBeTruthy(); }
  });
});
