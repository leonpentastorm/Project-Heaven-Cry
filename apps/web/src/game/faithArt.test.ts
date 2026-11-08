// Blessing 2.0 art (game/faithArt.ts): every patron, Whisper and vow has a placeholder; the painted art wins once built;
// file names follow the art brief; colours follow the colour rules.
import { describe, expect, it } from 'vitest';
import { PATRON_IDS, WHISPER_IDS, VOW_IDS, PATRON_MARK_PATHS, WHISPER_PATHS, VOW_PATHS, PATRON_ACCENT, FAITH_INK, FAITH_GOLD, accentOf,
  patronMarkUri, patronMarkSvg, prayerFile, prayerIconUri, vowIconUri, witnessedUri, patronPortrait } from './faithArt';

const svgOf = (u: string) => decodeURIComponent(u.replace('data:image/svg+xml,', ''));
describe('Blessing art placeholders', () => {
  it('a code-drawn mark for each of the eight patrons, a glyph for each Whisper and vow', () => {
    expect(PATRON_IDS.length).toBe(8);
    for (const p of PATRON_IDS) { expect(PATRON_MARK_PATHS[p]?.length, p).toBeGreaterThan(0); expect(svgOf(patronMarkUri(p))).toMatch(/^<svg[^>]*stroke="#FFFFFF"/); }
    for (const w of WHISPER_IDS) expect(WHISPER_PATHS[w]?.length, w).toBeGreaterThan(0);
    for (const v of VOW_IDS) expect(VOW_PATHS[v]?.length, v).toBeGreaterThan(0);
    expect(new Set(PATRON_IDS.map((p) => PATRON_MARK_PATHS[p].join())).size).toBe(8); // all different
  });
  it('the art brief file names', () => {
    expect(prayerFile('whisper', 'safe_passage')).toBe('whisper-safe-passage');
    expect(prayerFile('hymn', 'saints_shield', 'nerukhan', 1)).toBe('hymn-nerukhan-1');
    expect(prayerFile('miracle', 'x', 'nerukhan')).toBe('miracle-nerukhan');
  });
  it('a Hymn carries its patron mark small, a Miracle large behind; unknown ids still draw', () => {
    const h = svgOf(prayerIconUri('hymn', 'x', 'mother_ember', 2)), m = svgOf(prayerIconUri('miracle', 'x', 'mother_ember'));
    expect(h).toMatch(/scale\(\.33\)/); expect(m).toMatch(/scale\(\.667\)/);
    expect(svgOf(prayerIconUri('whisper', 'nonsense'))).toMatch(/<path/); expect(svgOf(patronMarkUri('a_future_patron'))).toMatch(/<path/);
    expect(svgOf(vowIconUri('stand'))).toMatch(/<path/); expect(svgOf(witnessedUri())).toMatch(/<path/);
    expect(patronMarkSvg('old_overcast', '#000000', 48)).toMatch(/width="48"/);
  });
  it('no portrait until it is painted (callers show the mark instead)', () => expect(patronPortrait('nerukhan')).toBeNull());
  it('colours: Virtue ink for words, gold light, each patron light for effects; the data wins when it gives one', () => {
    expect(FAITH_INK).toBe('#D36A90'); expect(FAITH_GOLD).toBe('#F2C46A');
    for (const p of PATRON_IDS) expect(PATRON_ACCENT[p]).toMatch(/^#[0-9A-F]{6}$/i);
    expect(accentOf('mother_ember')).toBe(PATRON_ACCENT.mother_ember); expect(accentOf('mother_ember', '#123456')).toBe('#123456');
    expect(accentOf('nobody')).toBe(FAITH_GOLD); expect(accentOf('nerukhan', 'gold')).toBe(PATRON_ACCENT.nerukhan);
  });
});
