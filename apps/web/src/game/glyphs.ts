// The 40 Sigil glyphs of rules 1.4 (docs/design/magic-presentation.md): our own geometric strokes, straight lines,
// circles and right angles, drawn in a 24 × 24 box. One set serves as map glyphs and as the Sigil icons. Each word's
// class gets a frame mark so a glance tells one group from another: elements sit on a bar, afflictions and boons in
// opposite corner brackets, Workings under a lid, Reach words between two side posts, Delivery and Burst words stand
// bare, the Filter (KIN) in a ring. RETURN (retired in 1.4) keeps its path so old logs and plates still draw.
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
  // rules 1.4: the 17 new words
  acid: 'M12 4 L17 12 A5 5 0 1 1 7 12 Z M10 14 H11 M13 16.5 H14',
  command: 'M5 5 H19 M12 5 V19 M8 15 L12 19 L16 15',
  quicken: 'M5 6 L11 12 L5 18 M12 6 L18 12 L12 18',
  sharpen: 'M12 3 L16 13 L12 21 L8 13 Z M12 9 V15',
  cleanse: 'M4 9 H20 M6 13 H18 M9 17 H15 M12 3 V6',
  step: 'M4 14 H9 V19 H4 Z M15 5 H20 V10 H15 Z M9 14 L15 10',
  raise: 'M4 19 H20 M6 19 V10 H18 V19 M6 14.5 H18 M12 10 V14.5 M9 14.5 V19 M15 14.5 V19',
  null: 'M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M7 12 H17',
  mask: 'M6 6 H18 V12 C18 16 15 19 12 19 C9 19 6 16 6 12 Z M8.5 11 H10.5 M13.5 11 H15.5',
  arc: 'M4 18 Q12 2 20 18 M16.5 16 L20 18 L20.5 14',
  sense: 'M10.5 10.5 H13.5 V13.5 H10.5 Z M7 7 H17 V17 H7 Z M4 4 H7 M17 4 H20 M4 20 H7 M17 20 H20',
  relay: 'M3 12 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M17 12 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M7 12 H17 M11 8 L15 12 L11 16',
  wait: 'M7 4 H17 M7 20 H17 M8 4 L16 20 M16 4 L8 20',
  watch: 'M7 20 H17 M9 20 V12 H15 V20 M12 12 V7 M12 7 L19 4',
  chain: 'M3 15 H6 V18 H3 Z M10.5 8 H13.5 V11 H10.5 Z M18 13 H21 V16 H18 Z M6 15 L10.5 11 M13.5 11 L18 13',
  leech: 'M6 5 L9 12 L12 5 L15 12 L18 5 M7 17 Q12 21 17 17',
  kin: 'M7 9 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M13 9 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M5 17 V14 H11 V17 M13 17 V14 H19 V17',
};
/** The frame mark by word class. */
const FRAME: Record<string, string> = {
  subject_element: 'M3 22 H21',
  subject_affliction: 'M2 6 V2 H6 M18 22 H22 V18',
  subject_boon: 'M18 2 H22 V6 M2 18 V22 H6',
  subject_working: 'M3 2 H21',
  reach: 'M1.5 9 V15 M22.5 9 V15',
  filter: 'M12 12 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0',
  // 1.2 classes, for old data
  subject_effect: 'M2 6 V2 H6 M18 22 H22 V18',
  modifier: 'M12 12 m-11 0 a11 11 0 1 0 22 0 a11 11 0 1 0 -22 0',
};
/** Does this word have a glyph of its own (every 1.4 word does)? */
export const hasGlyph = (word: string) => !!GLYPH_PATHS[word];

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

/** Rules 1.10 strokes: the join marks one tile draws toward its stroke neighbours. d is the direction (dx, dy) to the
 * neighbour; kind: 'line' (your side, faint), 'hot' (the hovered stroke), 'foe' (a hostile stroke you can see), 'preview'
 * (the draw step's joining line, dashed white). Solid, opaque inks: two halves that overlap in the gap never darken. */
export interface JoinSeg { d: [number, number]; kind: 'line' | 'hot' | 'foe' | 'preview' }
const JOIN_INK: Record<JoinSeg['kind'], string> = { line: '#2E8496', hot: '#8BDEEE', foe: '#8E3A40', preview: '#FFFFFF' };
/** One tile's join marks as an SVG data URI. The image box is the tile padded by `pad` on every side (in viewBox units,
 * the tile being `size` units), the line runs from the glyph's anchor to just past half the tile pitch, so the
 * neighbour's half meets it. Combat tiles: size 44, anchor 9 (the glyph icon's centre), pitch 48. */
export function joinUri(segs: JoinSeg[], o: { size: number; pad: number; anchor: [number, number]; pitch: number }): string {
  const half = o.pitch / 2 + 1, [ax, ay] = o.anchor, w = (k: JoinSeg['kind']) => (k === 'hot' ? 3.2 : k === 'preview' ? 2.4 : 2) * o.size / 44;
  const order: JoinSeg['kind'][] = ['foe', 'line', 'hot', 'preview'];
  const lines = [...segs].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).map((s) => {
    const x2 = ax + s.d[0] * half, y2 = ay + s.d[1] * half;
    return `<line x1="${ax}" y1="${ay}" x2="${x2}" y2="${y2}" stroke="${JOIN_INK[s.kind]}" stroke-width="${w(s.kind)}" stroke-linecap="${s.kind === 'preview' ? 'butt' : 'round'}"${s.kind === 'preview' ? ` stroke-dasharray="${3 * o.size / 44} ${2.5 * o.size / 44}"` : ''}/>`;
  }).join('');
  const v = -o.pad, span = o.size + 2 * o.pad;
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v} ${v} ${span} ${span}" fill="none">${lines}</svg>`);
}

/** Rules 1.10 word mastery: a five-point star, hollow for a Practised word, filled for a Mastered one (Intelligence ink;
 * always shown with its word, PRACTISED or MASTERED). 'new' draws a faint dotted outline. */
export function starUri(tier: 'new' | 'practised' | 'mastered', color = SIGIL_INK): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.2 : 10, a = -Math.PI / 2 + i * Math.PI / 5; pts.push((12 + r * Math.cos(a)).toFixed(2) + ',' + (12.6 + r * Math.sin(a)).toFixed(2)); }
  const fill = tier === 'mastered' ? color : 'none', stroke = tier === 'new' ? '#3B475D' : color;
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"${tier === 'new' ? ' stroke-dasharray="2 2"' : ''}/></svg>`);
}

/** Rules 1.10 sigil marks: an old Sigil word cut into a wall, as a carved stone plate. The groove is drawn three times
 * (a dark cut, a lit lower lip, the faint word ink inside), so it reads as carved, not painted. word: the glyph, or
 * null for a word you can't read yet (unread scratches in the same carved style). age: fresh glows faintly cyan, old is
 * plain stone, ancient is darker and weathered. damage: worn breaks the groove into dashes, broken adds a crack. */
export function markSvg(word: string | null, o: { age?: string; damage?: string; size?: number } = {}): string {
  const size = o.size || 48, age = o.age || 'old', dmg = o.damage || 'intact';
  const d = word ? (GLYPH_PATHS[word] || 'M6 6 L18 18 M18 6 L6 18') : 'M7 8 L12 6 L10.5 12 L16 10.5 M8 16.5 L16.5 15.5 L14 19 M15.5 5.5 L18 9';
  const plate = age === 'ancient' ? '#151A22' : '#1E2530', rim = age === 'ancient' ? '#2A313C' : '#3A4452', lit = age === 'ancient' ? '#4A5361' : '#6F7A8A';
  const ink = age === 'fresh' ? SIGIL_INK : age === 'ancient' ? '#5F7F88' : '#9FB4BC';
  const dash = dmg === 'worn' || dmg === 'broken' ? ' stroke-dasharray="3.2 1.6"' : '';
  const glow = age === 'fresh' ? `<filter id="m"><feGaussianBlur stdDeviation="0.9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : '';
  const crack = dmg === 'broken' ? `<path d="M3.5 4 L8 9.5 L6.5 12.5 L11 16 L9.5 21" stroke="#05070B" stroke-width="1.3" fill="none"/><path d="M4 4.6 L8.5 10" stroke="${lit}" stroke-width="0.5" fill="none"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">${glow}`
    + `<path d="M2.5 3.2 L21.2 2.5 L21.6 21.4 L2.8 21.7 Z" fill="${plate}" stroke="${rim}" stroke-width="1"/>`
    + `<path d="M3.6 20.6 L20.6 20.4 L20.4 3.6" fill="none" stroke="#0A0D13" stroke-width="0.8" stroke-opacity="0.8"/>`
    + `<g transform="translate(2.4 2.4) scale(0.8)" fill="none" stroke-linecap="round" stroke-linejoin="round">`
    + `<path d="${d}" stroke="${lit}" stroke-width="3.4" transform="translate(0.5 0.7)"${dash}/>`
    + `<path d="${d}" stroke="#05070B" stroke-width="3"${dash}/>`
    + `<path d="${d}" stroke="${ink}" stroke-width="1.1" stroke-opacity="${age === 'ancient' ? 0.6 : 0.9}"${dash}${glow ? ' filter="url(#m)"' : ''}/></g>`
    + crack + `</svg>`;
}
export const markUri = (word: string | null, o: { age?: string; damage?: string } = {}) => 'data:image/svg+xml,' + encodeURIComponent(markSvg(word, o));
