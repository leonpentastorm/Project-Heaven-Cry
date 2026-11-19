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
  // 0.31.12 (owed fix): a token's hover card's condition signs enlarge too (its name and text), and can be reached: the
  // card lingers a moment after the pointer leaves the token, and only its signs take a click (the card lets clicks
  // through to the tiles under it, as before)
  it("the token hover card's condition signs open the lightbox", async () => {
    const { expand } = await import('./shared');
    const card = expand('<!--TOKPOP:t-->'), img = (card.match(/<img[^>]*phc-cond-icon[^>]*>/) || [''])[0];
    expect(img).toContain('data-zoom="{{sc.word}}"'); expect(img).toContain('data-zoom-text="{{sc.tip}}"'); expect(img).toContain('phc-pop-zoom');
    const css = src(new URL('../', import.meta.url), 'main.tsx');
    expect(css).toContain('.phc-pop .phc-pop-zoom{pointer-events:auto}'); expect(css).toMatch(/\.phc-tok \.phc-pop\{[^}]*transition:visibility 0s \.\d+s/);
  });
  it('the lightbox shows name, picture and text', async () => {
    const { zoomer, lightboxVals } = await import('./shared');
    const self: any = { state: {}, setState(s: any) { Object.assign(this.state, s); } };
    zoomer(self, 'x.png', "Sinner's Due", 'perk', 'Your prayers deal 8% more damage.')();
    const v: any = lightboxVals(self);
    expect(v.lb).toMatchObject({ caption: "Sinner's Due", text: 'Your prayers deal 8% more damage.', hasText: true }); expect(v.lb.img).toBeTruthy();
  });
});
