// The 24 Sigil glyphs (docs/design/magic-presentation.md): our own geometric strokes, straight lines, circles and right
// angles, drawn in a 24 × 24 box. One set serves as map glyphs and as the Sigil icons. Each word's class gets a frame
// mark so a glance tells subject from form from motion: elements sit on a bar, effects in a corner bracket, forms and
// motions stand bare, the one modifier in a ring.
import { SIGIL } from '@engine';

/** Stroke paths for each word (24 × 24, round caps). */
export const GLYPH_PATHS: Record<string, string> = {
  fire: 'M12 4 L17 13 L12 11 L7 13 Z M12 11 L12 18',
  freeze: 'M12 4 V18 M6 7 L18 15 M18 7 L6 15',
  shock: 'M14 3 L8 12 H15 L9 20',
  stone: 'M6 8 H18 V17 H6 Z M6 12.5 H18 M12 8 V12.5',
  gale: 'M4 8 H15 A3 3 0 1 0 12 5 M4 13 H18 A3 3 0 1 1 15 16',
  spark: 'M12 5 V9 M12 15 V19 M5 12 H9 M15 12 H19 M12 12 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0',
  ward: 'M12 4 L18 7 V12 C18 16 15 18 12 20 C9 18 6 16 6 12 V7 Z',
  mend: 'M12 6 V18 M6 12 H18 M8 8 L16 16',
  bind: 'M6 6 L18 18 M18 6 L6 18 M9 12 A3 3 0 1 0 15 12 A3 3 0 1 0 9 12',
  blind: 'M4 12 Q12 5 20 12 Q12 19 4 12 Z M5 19 L19 5',
  slow: 'M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M12 7 V12 H15',
  muddle: 'M6 6 H18 L6 12 H18 L6 18 H18',
  dread: 'M12 4 L20 18 H4 Z M12 9 V13 M12 15.5 V16',
  veil: 'M4 6 H20 M6 6 V18 M10 6 V15 M14 6 V18 M18 6 V15',
  light: 'M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M12 4 V6 M12 18 V20 M4 12 H6 M18 12 H20 M6.5 6.5 L8 8 M16 16 L17.5 17.5 M17.5 6.5 L16 8 M8 16 L6.5 17.5',
  silence: 'M8 9 H11 L15 5 V19 L11 15 H8 Z M17 9 L21 13 M21 9 L17 13',
  condense: 'M5 5 L10 10 M19 5 L14 10 M5 19 L10 14 M19 19 L14 14 M10 10 H14 V14 H10 Z',
  spread: 'M12 18 L5 6 M12 18 L12 5 M12 18 L19 6 M9 18 H15',
  push: 'M4 12 H18 M13 7 L18 12 L13 17 M4 8 V16',
  stay: 'M12 4 V16 M6 16 H18 M8 20 H16',
  seek: 'M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M12 3 V8 M12 16 V21 M3 12 H8 M16 12 H21',
  return: 'M18 8 H8 A4 4 0 0 0 8 16 H16 M11 5 L8 8 L11 11',
  pull: 'M20 12 H6 M11 7 L6 12 L11 17 M20 8 V16',
  twice: 'M8 6 V18 M16 6 V18 M5 12 H19',
};
/** The frame mark by word class. */
const FRAME: Record<string, string> = {
  subject_element: 'M3 22 H21',
  subject_effect: 'M2 6 V2 H6 M18 22 H22 V18',
  modifier: 'M12 12 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0',
};

/** Sigil ink: Intelligence ink for glyph strokes, Mind cyan for the glow (never Soul violet). */
export const SIGIL_INK = '#8BDEEE', SIGIL_GLOW = '#4FC8DF', SOUL_INK = '#AE9BFF', SOUL_WARM = '#F2C46A';

/** An SVG string for a word's glyph. */
export function glyphSvg(word: string, color = SIGIL_INK, size = 24, opts: { frame?: boolean; glow?: boolean } = {}): string {
  const d = GLYPH_PATHS[word] || 'M6 6 L18 18 M18 6 L6 18';
  const f = opts.frame !== false ? FRAME[SIGIL[word]?.class || ''] : '';
  const glow = opts.glow ? `<filter id="g"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glow}<g${opts.glow ? ' filter="url(#g)"' : ''}>${f ? `<path d="${f}" stroke-opacity="0.55" stroke-width="1.2"/>` : ''}<path d="${d}"/></g></svg>`;
}
/** The same glyph as a data URI, for <img src> in templates. */
export const glyphUri = (word: string, color = SIGIL_INK, opts: { frame?: boolean; glow?: boolean } = {}) => 'data:image/svg+xml,' + encodeURIComponent(glyphSvg(word, color, 24, opts));
/** Unreadable scratches: a glyph someone else drew that you haven't read (no Analysis yet). */
export const scratchUri = (color = '#A3AEC2') => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"><path d="M5 8 L11 6 L9 12 L15 10 M8 16 L17 15 L14 19 M16 5 L19 9"/></svg>`);
/** The held-heart icon (Soul): a heart whose colour warms from violet toward gold with the stage (1 to 4). */
export function heartUri(stage = 1): string {
  const c = ['#AE9BFF', '#C59BE8', '#DDB0A8', '#F2C46A'][Math.max(0, Math.min(3, stage - 1))];
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 20 C5 15 3 11 3 8 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 8 C21 11 19 15 12 20 Z" fill="${c}" fill-opacity="0.85" stroke="#FFFFFF" stroke-width="1"/></svg>`);
}
