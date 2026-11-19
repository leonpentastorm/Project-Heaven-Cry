// The menus' type scale (game/typeScale.ts): set in one place, and no menu source types a font size in pixels below
// the body size (15 px): a smaller line is var(--fs-sub) (13 px). Excepted, as not menu text: the map token's own label
// (screens/shared.js tokStyle), and an SVG element's own text (its size is in the drawing's units).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FS, TYPE_SCALE_CSS, fontPx } from './typeScale';

const SRC = fileURLToPath(new URL('../', import.meta.url));
const files = [
  ...readdirSync(SRC + 'templates').filter((f) => f.endsWith('.html')).map((f) => 'templates/' + f),
  ...readdirSync(SRC + 'screens').filter((f) => f.endsWith('.js')).map((f) => 'screens/' + f),
  ...['game', 'game/spotlight', 'game/fx', 'title'].flatMap((d) => readdirSync(SRC + d).filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.')).map((f) => d + '/' + f)),
  'App.tsx',
];
/** The one map exception: the token's label on its tile (screens/shared.js tokStyle). */
const SKIP_LINE = /tokStyle: 'position: absolute; inset: 6%/;
/** An SVG element's own tags (a <text> or <svg> sizes in its drawing's units): taken out of the line, the rest is read. */
const SVG_TAG = /<(?:text|svg)\b[^>]*>/g;
/** font-size: Npx, React's fontSize: N, and the font shorthand (font: 700 Npx/1 ...). */
const SIZE = /font-size: ?(\d+(?:\.\d+)?)px|fontSize: '?(\d+(?:\.\d+)?)(?:px)?'?(?=[,\s}])|font: ?["']?(?:[a-z]+ )*(?:\d00 )?(\d+(?:\.\d+)?)px/g;

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
  it('no menu source types a font size in pixels under the body size (15 px): a smaller line is var(--fs-sub)', () => {
    const bad: string[] = [];
    for (const f of files) readFileSync(SRC + f, 'utf-8').split('\n').forEach((line, i) => {
      if (SKIP_LINE.test(line)) return;
      for (const m of line.replace(SVG_TAG, ' ').matchAll(SIZE)) { const v = Number(m[1] || m[2] || m[3]); if (v < 15 && v !== 0) bad.push(f + ':' + (i + 1) + ' ' + m[0]); }
    });
    expect(bad).toEqual([]);
  });
  it('the scan reaches the fight panel, the cut-in, the effects, the title and the app shell; the shorthand is read', () => {
    for (const f of ['screens/combat.js', 'game/spotlight/CutInLayer.tsx', 'game/fx/feelings.ts', 'title/Title.tsx', 'App.tsx', 'game/techView.ts']) expect(files).toContain(f);
    expect([...'a { font: 700 10px/1 x }'.matchAll(SIZE)].map((m) => m[3])).toEqual(['10']);
    expect([...'<svg width="9"><text font-size="9px">x</text></svg><span style="font-size: 11px">'.replace(SVG_TAG, ' ').matchAll(SIZE)].map((m) => m[1])).toEqual(['11']);
  });
});
