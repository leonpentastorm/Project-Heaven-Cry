// Blessing 2.0 art (game/faithArt.ts): every patron, Whisper and vow has a placeholder; the painted art wins once built;
// file names follow the art brief; colours follow the colour rules.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATRON_IDS, WHISPER_IDS, VOW_IDS, PATRON_MARK_PATHS, WHISPER_PATHS, VOW_PATHS, PATRON_ACCENT, FAITH_INK, FAITH_GOLD, accentOf,
  patronMarkUri, patronMarkSvg, prayerFile, prayerIconUri, vowIconUri, witnessedUri, patronPortrait, PORTRAIT_FACE, faceOf, faceImgStyle, patronFace } from './faithArt';

const svgOf = (u: string) => decodeURIComponent(u.replace('data:image/svg+xml,', ''));
describe('Blessing art placeholders', () => {
  it('a code-drawn mark for each of the eight patrons, a glyph for each Whisper and vow', () => {
    expect(PATRON_IDS.length).toBe(8);
    for (const p of PATRON_IDS) { expect(PATRON_MARK_PATHS[p]?.length, p).toBeGreaterThan(0); expect(patronMarkSvg(p, '#FFFFFF')).toMatch(/^<svg[^>]*stroke="#FFFFFF"/); }
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
    // placeholders (painted art now covers the real ids): a Hymn level with no file, a Miracle for an unpainted patron
    const h = svgOf(prayerIconUri('hymn', 'x', 'mother_ember', 9)), m = svgOf(prayerIconUri('miracle', 'x', 'a_future_patron'));
    expect(h).toMatch(/scale\(\.33\)/); expect(m).toMatch(/scale\(\.667\)/);
    expect(svgOf(prayerIconUri('whisper', 'nonsense'))).toMatch(/<path/); expect(svgOf(patronMarkUri('a_future_patron'))).toMatch(/<path/);
    expect(svgOf(vowIconUri('stand'))).toMatch(/<path/); expect(svgOf(witnessedUri())).toMatch(/<path/);
    expect(patronMarkSvg('old_overcast', '#000000', 48)).toMatch(/width="48"/);
  });
  it('the painted portraits are wired for all eight (two files carry "the_"); an unpainted patron has none', () => {
    for (const id of ['nerukhan', 'the_quartermaster', 'the_laughing_mask', 'toll_keeper', 'mother_ember', 'old_overcast', 'the_matchmaker', 'counting_weaver']) expect(patronPortrait(id)).toMatch(/\/assets\/patron-/);
    expect(patronPortrait('a_future_patron')).toBeNull();
  });
  it('the painted marks and prayer icons are wired for all eight patrons and the six Whispers', () => {
    const ids = ['nerukhan', 'the_quartermaster', 'the_laughing_mask', 'toll_keeper', 'mother_ember', 'old_overcast', 'the_matchmaker', 'counting_weaver'];
    for (const id of ids) {
      expect(patronMarkUri(id)).toMatch(/\/assets\/patron-mark-/); expect(prayerIconUri('miracle', id, id)).toMatch(/\/assets\/prayer-miracle-/);
      for (const n of [1, 2, 3]) expect(prayerIconUri('hymn', 'x', id, n)).toMatch(/\/assets\/prayer-hymn-/);
    }
    for (const w of ['luck', 'health', 'protection', 'courage', 'guidance', 'safe_passage']) expect(prayerIconUri('whisper', w)).toMatch(/\/assets\/prayer-whisper-/);
    // Rules 1.21: Rebuke, the seventh Whisper, is painted since 12 Nov (W3); its own line mark remains the fallback.
    expect(prayerIconUri('whisper', 'rebuke')).toMatch(/\/assets\/prayer-whisper-rebuke/); expect(WHISPER_PATHS.rebuke.length).toBeGreaterThan(0); expect(WHISPER_IDS).toContain('rebuke');
  });
  it('colours: Virtue ink for words, gold light, each patron light for effects; the data wins when it gives one', () => {
    expect(FAITH_INK).toBe('#D36A90'); expect(FAITH_GOLD).toBe('#F2C46A');
    for (const p of PATRON_IDS) expect(PATRON_ACCENT[p]).toMatch(/^#[0-9A-F]{6}$/i);
    expect(accentOf('mother_ember')).toBe(PATRON_ACCENT.mother_ember); expect(accentOf('mother_ember', '#123456')).toBe('#123456');
    expect(accentOf('nobody')).toBe(FAITH_GOLD); expect(accentOf('nerukhan', 'gold')).toBe(PATRON_ACCENT.nerukhan);
  });
  it('the --faith-light token: index.html defines it as FAITH_GOLD, and the faith templates use var(--faith-light), not the hex', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const html = readFileSync(resolve(root, 'index.html'), 'utf8'), m = /:root\s*\{[^}]*--faith-light:\s*(#[0-9A-Fa-f]{6})/.exec(html);
    expect(m && m[1].toUpperCase()).toBe(FAITH_GOLD);
    const main = readFileSync(resolve(root, 'src/templates/main.template.html'), 'utf8');
    const faithTab = main.slice(main.indexOf('{{tabFaith}}'), main.indexOf('aria-label="Rites"'));
    expect(faithTab).toMatch(/var\(--faith-light\)/); expect(faithTab).not.toMatch(/#F2C46A/i);
  });
  it('the palette (art/style-guide/palette.json ui.states.faith_light) carries the same gold', () => {
    const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
    const palette = JSON.parse(readFileSync(resolve(repo, 'art/style-guide/palette.json'), 'utf8'));
    expect(String(palette.ui.states.faith_light).toUpperCase()).toBe(FAITH_GOLD);
  });
  it('Faith 2.2: each portrait\'s face box (the Hymn\'s crop, the cards\' crops) lies inside its painting', () => {
    for (const id of PATRON_IDS) {
      const f = faceOf(id); expect(PORTRAIT_FACE[id], id).toBeTruthy();
      // The square, as fractions of the 800 × 1000 painting: inside on every side.
      expect(f.x - f.s / 2, id).toBeGreaterThanOrEqual(0); expect(f.x + f.s / 2, id).toBeLessThanOrEqual(1);
      expect(f.y - (f.s * 0.8) / 2, id).toBeGreaterThanOrEqual(0); expect(f.y + (f.s * 0.8) / 2, id).toBeLessThanOrEqual(1);
    }
    expect(faceOf('toll_keeper')).toBe(PORTRAIT_FACE.the_toll_keeper); expect(faceOf('counting_weaver')).toBe(PORTRAIT_FACE.the_counting_weaver);
    // Nerukhan: the image is 1/0.36 of the box wide, shifted so the face's centre is the box's centre.
    expect(faceImgStyle('nerukhan')).toBe('position: absolute; display: block; max-width: none; width: 277.78%; height: auto; left: -97.22%; top: -9.03%');
    const p = patronFace('mother_ember'); expect(p.painted).toBe(true); expect(p.src).toMatch(/patron-mother_ember/);
    const none = patronFace('a_future_patron'); expect(none.painted).toBe(false); expect(none.src).toMatch(/^data:image\/svg/); expect(none.imgStyle).toMatch(/inset: 12%/);
  });
});
