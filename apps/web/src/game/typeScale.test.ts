// The menus' type scale (game/typeScale.ts): set in one place, and no menu source types a font size below the
// secondary size (13 px). Excepted, as not menu text: what draws on the map (a token's label), the fight panel's
// deliberate squeeze when every door is open (.phc-me-urgent), and SVG text.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FS, TYPE_SCALE_CSS, fontPx } from './typeScale';

const SRC = fileURLToPath(new URL('../', import.meta.url));
const files = [
  ...readdirSync(SRC + 'templates').filter((f) => f.endsWith('.html')).map((f) => 'templates/' + f),
  ...readdirSync(SRC + 'screens').filter((f) => f.endsWith('.js')).map((f) => 'screens/' + f),
  ...readdirSync(SRC + 'game').filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.')).map((f) => 'game/' + f),
];
const SKIP_LINE = /inset: 6%|phc-me-urgent|<text\b|<svg\b|\.phc-tok\b/;

describe('the type scale', () => {
  it('is two sizes, body at least 15 px and secondary at least 13 px, read through CSS variables', () => {
    expect(FS.body).toBeGreaterThanOrEqual(15); expect(FS.sub).toBeGreaterThanOrEqual(13);
    expect(TYPE_SCALE_CSS).toBe(':root{--fs-body:' + FS.body + 'px;--fs-sub:' + FS.sub + 'px}');
    expect(fontPx('var(--fs-body)')).toBe(FS.body); expect(fontPx('var(--fs-sub)')).toBe(FS.sub); expect(fontPx('17px')).toBe(17);
  });
  it('is set in one place: no other source defines --fs-body or --fs-sub', () => {
    const defs = files.filter((f) => f !== 'game/typeScale.ts' && /--fs-(body|sub)\s*:/.test(readFileSync(SRC + f, 'utf-8')));
    expect(defs).toEqual([]);
    expect(readFileSync(SRC + '../index.html', 'utf-8')).not.toMatch(/--fs-(body|sub)\s*:/);
  });
  it('no menu source types a font size under 13 px (nor 14 px: that is the body size now)', () => {
    const bad: string[] = [];
    for (const f of files) readFileSync(SRC + f, 'utf-8').split('\n').forEach((line, i) => {
      if (SKIP_LINE.test(line)) return;
      for (const m of line.matchAll(/font-size: ?(\d+(?:\.\d+)?)px|fontSize: (\d+(?:\.\d+)?)(?=[,\s}])/g)) if (Number(m[1] || m[2]) < 15 && Number(m[1] || m[2]) !== 0) bad.push(f + ':' + (i + 1) + ' ' + m[0]);
    });
    expect(bad).toEqual([]);
  });
});
