// The credits (the title screen's Credits page): every open licence links its deed, as CC BY asks (4.0 section
// 3(a)(1)(C): the licence's URI or a hyperlink to it); every CC BY credit names its author and its source.
import { describe, expect, it } from 'vitest';
import { CREDITS, LICENCE_URL, licenceUrl } from './credits';

describe('the credits', () => {
  const all = CREDITS.flatMap((g) => g.items);
  it('every Creative Commons, Apache or MIT licence named has a link to its deed', () => {
    for (const c of all) if (c.licence && /^(CC|Apache|MIT)/.test(c.licence)) expect(licenceUrl(c.licence), c.what + ' · ' + c.licence).toMatch(/^https:\/\//);
    expect(LICENCE_URL['CC-BY 4.0']).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(licenceUrl('Project Heaven Cry')).toBeUndefined(); expect(licenceUrl(undefined)).toBeUndefined();
  });
  it('every CC BY credit names its author and links its source (the Miracle\'s sting among them)', () => {
    const by = all.filter((c) => /^CC-BY/.test(c.licence || ''));
    expect(by.some((c) => /30_revive_03/.test(c.what) && c.who === 'leohpaz')).toBe(true);
    for (const c of by) { expect(c.who.trim(), c.what).not.toBe(''); expect(c.url, c.what).toMatch(/^https?:\/\//); }
  });
});
