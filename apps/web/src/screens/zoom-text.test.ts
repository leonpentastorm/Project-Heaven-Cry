// 0.31.9 (Leon: enlarging a perk icon showed the picture and the name only): every enlarge slot passes the thing's text
// to the one lightbox (shared.js zoomer, and data-zoom / data-zoom-text on a template's <img>).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('location', { search: '', hash: '' });
const here = new URL('./', import.meta.url), tpl = new URL('../templates/', import.meta.url);
const src = (u: URL, f: string) => readFileSync(new URL(f, u), 'utf-8');
/** Slots whose name is already the whole text (a pile entry's label, a vow's own words). */
const NAME_IS_TEXT = new Set(['{{pe.label}}', '{{fa.vow.label}}']);

describe('the enlarged view shows the text', () => {
  it('every <img data-zoom> in the templates carries data-zoom-text', () => {
    const bad: string[] = [];
    for (const f of readdirSync(tpl).filter((x) => x.endsWith('.html'))) for (const m of src(tpl, f).matchAll(/<img[^>]*data-zoom="([^"]*)"[^>]*>/g))
      if (!/data-zoom-text=/.test(m[0]) && !NAME_IS_TEXT.has(m[1])) bad.push(f + ': ' + m[1]);
    expect(bad).toEqual([]);
  });
  it('every icon, perk or skill zoomer passes its text', () => {
    const bad: string[] = [];
    for (const f of readdirSync(here).filter((x) => x.endsWith('.js'))) for (const m of src(here, f).matchAll(/zoomer\((?:this|self), ([^()]|\([^()]*\))*?'(perk|icon|skill)'\s*\)/g)) bad.push(f + ': ' + m[0].slice(0, 70));
    expect(bad).toEqual([]);
  });
  it('the lightbox shows name, picture and text', async () => {
    const { zoomer, lightboxVals } = await import('./shared');
    const self: any = { state: {}, setState(s: any) { Object.assign(this.state, s); } };
    zoomer(self, 'x.png', "Sinner's Due", 'perk', 'Your prayers deal 8% more damage.')();
    const v: any = lightboxVals(self);
    expect(v.lb).toMatchObject({ caption: "Sinner's Due", text: 'Your prayers deal 8% more damage.', hasText: true }); expect(v.lb.img).toBeTruthy();
  });
});
