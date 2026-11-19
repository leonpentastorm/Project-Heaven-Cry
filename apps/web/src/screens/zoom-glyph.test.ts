// @vitest-environment jsdom
// 0.31.12 fix round (item F): a token card's sign with no picture (a glyph) opens the one lightbox too, with its name,
// its text and the glyph shown large, as a sign with an icon does (shared.js: the click handler and lightboxVals; the
// hover card's template, TOKPOP).
import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('location', { search: '', hash: '' });

describe('a glyph-only sign enlarges', () => {
  it('the hover card\'s glyph sign carries the enlarge request, and a click on it opens the lightbox with the glyph', async () => {
    const { expand, lightboxVals } = await import('./shared');
    const card = expand('<!--TOKPOP:t-->'), glyph = (card.match(/<span[^>]*data-zoom-glyph[^>]*>/) || [''])[0];
    expect(glyph).toContain('data-zoom="{{sc.word}}"'); expect(glyph).toContain('data-zoom-text="{{sc.tip}}"');
    expect(glyph).toContain('data-zoom-glyph="{{sc.glyph}}"'); expect(glyph).toContain('phc-pop-zoom');
    // the real click path: the document's capture handler, the screen that last rendered lightboxVals hosts it
    const self: any = { state: {}, setState(s: any) { Object.assign(this.state, s); } };
    lightboxVals(self);
    const el = document.createElement('span');
    el.setAttribute('data-zoom', 'Taunted'); el.setAttribute('data-zoom-text', 'Your next attack must be aimed at the one who Taunted you.'); el.setAttribute('data-zoom-glyph', '!');
    el.textContent = '!'; document.body.appendChild(el);
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const v: any = lightboxVals(self);
    expect(v.lbOpen).toBe(true);
    expect(v.lb).toMatchObject({ caption: 'Taunted', glyph: '!', hasGlyph: true, hasImg: false, hasText: true });
    expect(v.lb.text).toMatch(/^Your next attack/);
  });
});
