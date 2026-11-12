// Blessing 2.0 (rules 1.6) art for the web game: the eight patrons' marks, the prayer icons (7 Whispers, the Hymns, the
// Miracles), the vow glyphs, the Witnessed eye, and the patrons' portraits, each resolved to the painted art when it is
// there (docs/design/handoffs/blessing-art-brief.md: art/portraits/patrons/<id>.png, art/emblems/patrons/
// <id>.png, art/icons/prayers/<file>.png; `npm run assets` builds them as patron-<id>, patron-mark-<id> and prayer-<file>)
// and to a code-drawn white placeholder until then. Dropping the art in needs no code change: run `npm run assets`.
//
// Placeholders follow the art brief's ideas, drawn in the classIcons.ts style: 24 × 24 white line marks, no colour (the
// game tints nothing; a patron's accent lights effects only, never text or icons).
import ASSETS from './assets.json';

/** The launch patrons' ids, as in the art brief (the engine's data/patrons.json v2 is the authority once it lands). */
export const PATRON_IDS = ['nerukhan', 'the_quartermaster', 'the_laughing_mask', 'the_toll_keeper', 'mother_ember', 'old_overcast', 'the_matchmaker', 'the_counting_weaver'] as const;
export const WHISPER_IDS = ['luck', 'health', 'protection', 'courage', 'guidance', 'safe_passage', 'rebuke'] as const;
export const VOW_IDS = ['shield', 'mercy', 'stand', 'bare', 'unarmed_faith', 'no_one_behind'] as const;

// ---------- colour (proposal for Leon: docs/design/handoffs/blessing-ui-HANDOFF.md) ----------
/** Faith's words take Virtue ink (the Faith skill's attribute). */
export const FAITH_INK = '#D36A90';
/** The light of an answered prayer: gold, the token --faith-light (approved by Leon, 8 Nov 2026; defined in index.html's
 *  :root and recorded in docs/design/colour-system.md). Templates use var(--faith-light); code uses this constant. Light
 *  only (glows, the Miracle, the Devotion meter's fill, a patron's mark lit), always beside a word. */
export const FAITH_GOLD = '#F2C46A';
/** Each patron's light (effects only), from the art brief's accent words, until data/patrons.json v2 gives its own. */
export const PATRON_ACCENT: Record<string, string> = {
  nerukhan: '#F2DFA0', // pale gold
  the_quartermaster: '#B9A86A', // olive brass
  the_laughing_mask: '#E8475C', // crimson (and white)
  the_toll_keeper: '#C9D6E6', // cold silver
  mother_ember: '#F59A4C', // warm orange
  old_overcast: '#6E9CF0', // storm blue
  the_matchmaker: '#EC6A86', // rose red
  the_counting_weaver: '#E6C25A', // thread gold
};
/** A patron's light: the data's accent when given, else the table above, else gold. */
// The data says 'toll_keeper' and 'counting_weaver' where the art says 'the_toll_keeper' and 'the_counting_weaver': both
// forms find the patron's light (before, those two fell back to gold).
export const accentOf = (patron: string | null | undefined, dataAccent?: string | null) => { const p = String(patron || ''); return dataAccent && /^#[0-9a-f]{6}$/i.test(dataAccent) ? dataAccent : PATRON_ACCENT[p] || PATRON_ACCENT['the_' + p] || PATRON_ACCENT[p.replace(/^the_/, '')] || FAITH_GOLD; };

// ---------- the drawings (24 × 24, line art; c() is a circle path) ----------
const c = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
/** The patrons' marks (the art brief's ideas). */
export const PATRON_MARK_PATHS: Record<string, string[]> = {
  // an open raised hand inside a ring of small saints' halos
  nerukhan: [c(12, 12, 9), 'M9.5 16 V10 M11.2 16 V8.5 M12.8 16 V8.5 M14.5 16 V10.5 M9.5 16 Q12 18.5 14.5 16 M9.5 12.5 L8 11', c(12, 3.6, 1), c(19.3, 7.8, 1), c(4.7, 7.8, 1)],
  // a stamped seal crossed with a ration tag
  the_quartermaster: [c(12, 12, 6.5), c(12, 12, 4), 'M4 18 L10 12 M16 6 L20 4', 'M17 16 h4 v4 h-4 Z M19 16 V14'],
  // a grinning half-mask with one tear-shaped spark
  the_laughing_mask: ['M4 8 Q12 4 20 8 Q20 15 12 18 Q4 15 4 8 Z', 'M7 10 Q8.5 8.6 10 10 M14 10 Q15.5 8.6 17 10', 'M8 13.5 Q12 16.5 16 13.5', 'M17.5 18 Q18.5 20 17.5 21 Q16.5 20 17.5 18 Z'],
  // a coin with a small boat-lantern above it
  the_toll_keeper: [c(12, 15.5, 5), c(12, 15.5, 2.3), 'M12 3 V6 M10.5 6 H13.5 V9.5 H10.5 Z M12 9.5 V10.5'],
  // a kettle whose steam curls into a flame
  mother_ember: ['M6 13 H17 V19 H6 Z M17 14.5 Q20 15 20 12 M8 13 Q11.5 10 15 13', 'M10 9.5 Q9 7 11 5.5 Q12 7.5 13.5 6 Q14.5 8.5 12.5 10'],
  // a cloud with one thick lightning bolt like a sceptre
  old_overcast: ['M6 13 Q3 13 3.5 10 Q4 7.5 7 8 Q8 4.5 12 5 Q15.5 5 16.5 8 Q20.5 8 20.5 11 Q20.5 13 18 13 Z', 'M13 13 L10 17.5 H13 L11 21.5'],
  // two loops of thread tied in a knot
  the_matchmaker: [c(8, 10, 4), c(16, 10, 4), 'M10.5 13 L8 20 M13.5 13 L16 20', c(12, 13, 1.2)],
  // three threads through an abacus bead row
  the_counting_weaver: ['M5 4 V20 M12 4 V20 M19 4 V20', 'M3 12 H21', c(5, 12, 1.8), c(12, 12, 1.8), c(19, 12, 1.8), 'M3 4 H21 M3 20 H21'],
};
const GENERIC_MARK = [c(12, 12, 8), 'M12 5 V9 M12 15 V19 M5 12 H9 M15 12 H19'];
/** The Whispers: the six of the art brief, and Rebuke (rules 1.21: the seventh; its painted icon is asked for in
 *  art/briefs/ART-REQUESTS.md, and until it is delivered this line mark is what shows). */
export const WHISPER_PATHS: Record<string, string[]> = {
  luck: ['M12 4 V7', 'M10.5 9 Q12 8 13.5 9 V18 Q12 19 10.5 18 Z', 'M8 5 L9.5 7 M16 5 L14.5 7'], // a coin on its edge under a ray
  health: ['M5 14 Q5 19 12 19 Q19 19 19 14 M5 14 H9 M15 14 H19', c(12, 10, 2.2), 'M12 5 V6.5 M8.5 7 L9.5 8 M15.5 7 L14.5 8'], // cupped hands, a small light
  protection: ['M4 14 Q12 3 20 14', c(12, 15.5, 2.5), 'M8.5 21 Q12 17.5 15.5 21'], // an arc of light over a bowed head
  courage: ['M12 6 Q15 10 13.5 13 Q12.5 15 12 14 Q11.5 15 10.5 13 Q9 10 12 6 Z', 'M12 14 V19 M9 19 H15', 'M3 8 H7 M3 12 H6 M17 8 H21 M18 12 H21'], // a candle flame in wind lines
  guidance: ['M4 9 Q12 3 20 9 Q12 15 4 9 Z', c(12, 9, 2), 'M9 21 L11 15 M15 21 L13 15'], // an eye of a halo, a path below
  safe_passage: [c(12, 12, 8.5), 'M10.5 8 Q12.8 8 12.8 11 Q12.8 15 10.8 16 Q9.4 15 9.6 12 Q9.6 8.8 10.5 8 Z', c(13.6, 6.6, 0.7), c(11.6, 6, 0.7)], // a footprint in a ring
  rebuke: ['M12 3 V11', 'M9 8 L12 11 L15 8', c(12, 15.5, 2.5), 'M6 21 H18', 'M5 5 L7 7 M19 5 L17 7'], // a ray coming down on a bowed head
};
/** A Hymn by level (I, II, III): a rising ray with its level as bars; a Miracle: a radiant opening. */
const HYMN_PATHS = (lv: number): string[] => { const n = Math.max(1, Math.min(3, lv)); return ['M12 3 L8.5 14 H15.5 Z', 'M6 16 H18', ...Array.from({ length: n }, (_, i) => 'M' + (12 + (i - (n - 1) / 2) * 3.5) + ' 18.5 V22')]; };
const MIRACLE_PATHS = [c(12, 12, 4), 'M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M19.1 4.9 L17 7 M7 17 L4.9 19.1'];
/** The vows (section 5). */
export const VOW_PATHS: Record<string, string[]> = {
  shield: ['M12 4 L18 6.5 V12 C18 16 15 18 12 20 C9 18 6 16 6 12 V6.5 Z', 'M9 12 L11 14 L15 10'], // "None of them falls."
  mercy: ['M6 13 Q6 8 9 8 V13 M9 8 Q9 5 12 5 V13 M12 6 Q15 6 15 9 V13 M15 10 Q18 10 18 13 Q18 19 12 19 Q6 19 6 13'], // an open hand: "I spare who yields."
  stand: ['M7 20 H17 M12 20 V6 M8 10 L12 6 L16 10'], // a planted line: "I don't give ground."
  bare: ['M7 11 V7 Q7 5.5 8.5 5.5 Q10 5.5 10 7 V11 M10 9 Q10 7.5 11.5 7.5 Q13 7.5 13 9 V11 M13 9.5 Q13 8 14.5 8 Q16 8 16 9.5 V14 Q16 19 11.5 19 Q7 19 7 14 Z'], // a fist: "By my own hands."
  unarmed_faith: [c(12, 12, 8), 'M6.3 6.3 L17.7 17.7', 'M12 7 V9 M12 15 V17'], // no magic but theirs
  no_one_behind: [c(8, 9, 2.2), c(16, 9, 2.2), 'M4.5 19 Q8 13 11.5 19 M12.5 19 Q16 13 19.5 19', 'M3 21 H21'], // nobody left behind
};
/** Witnessed: an open eye with rays. */
export const WITNESSED_PATHS = ['M3 12 Q12 4 21 12 Q12 20 3 12 Z', c(12, 12, 2.6), 'M12 3 V5 M5.5 5.5 L7 7 M18.5 5.5 L17 7'];

/** An SVG string for a set of line paths (white by default). */
export function lineSvg(paths: string[], color = '#FFFFFF', size = 24, extra = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${extra}${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
const uri = (svg: string) => 'data:image/svg+xml,' + encodeURIComponent(svg);
const A = ASSETS as Record<string, string>;
/** The painted art when `npm run assets` has built it, else null. */
export const assetFor = (key: string, large = false): string | null => (large ? A[key + '-lg'] || A[key] : A[key]) || null;

// ---------- resolvers (painted art first, the placeholder otherwise) ----------
/** A patron's mark: the painted emblem, else the code-drawn one. */
export const patronMarkSvg = (patron: string, color = '#FFFFFF', size = 24) => lineSvg(PATRON_MARK_PATHS[patron] || GENERIC_MARK, color, size);
export const patronMarkUri = (patron: string, color = '#FFFFFF') => assetFor('patron-mark-' + patron) || assetFor('patron-mark-the_' + patron) || uri(patronMarkSvg(patron, color));
/** A patron's portrait (4:5), or null until it is painted (callers show the mark large instead). */
// The art set names two patrons with their article (the_toll_keeper, the_counting_weaver): accept either spelling.
export const patronPortrait = (patron: string, large = false) => assetFor('patron-' + patron, large) || assetFor('patron-the_' + patron, large) || assetFor('patron-' + patron.replace(/^the_/, ''), large);
/** The file name the art brief gives a prayer's icon (without .png). */
export function prayerFile(kind: 'whisper' | 'hymn' | 'miracle', id: string, patron?: string | null, level?: number): string {
  if (kind === 'whisper') return 'whisper-' + id.replace(/_/g, '-');
  if (kind === 'miracle') return 'miracle-' + (patron || id);
  return 'hymn-' + (patron || 'any') + '-' + (level || 1);
}
/** A prayer's icon: the painted one, else a placeholder (a Hymn carries its patron's mark small in a corner, a Miracle
 *  carries it large behind, as the brief asks). */
export function prayerIconUri(kind: 'whisper' | 'hymn' | 'miracle', id: string, patron?: string | null, level?: number, color = '#FFFFFF'): string {
  // The painted set names two patrons with their article (hymn-the_toll_keeper-1): try both spellings.
  const alt = patron ? (patron.startsWith('the_') ? patron.slice(4) : 'the_' + patron) : null;
  const painted = assetFor('prayer-' + prayerFile(kind, id, patron, level)) || (alt ? assetFor('prayer-' + prayerFile(kind, id, alt, level)) : null); if (painted) return painted;
  if (kind === 'whisper') return uri(lineSvg(WHISPER_PATHS[id] || GENERIC_MARK, color));
  const mark = PATRON_MARK_PATHS[patron || ''] || GENERIC_MARK;
  if (kind === 'miracle') return uri(lineSvg(MIRACLE_PATHS, color, 24, `<g opacity=".45" transform="translate(4 4) scale(.667)">${mark.map((d) => `<path d="${d}"/>`).join('')}</g>`));
  return uri(lineSvg(HYMN_PATHS(level || 1), color, 24, `<g transform="translate(16 0) scale(.33)" stroke-width="3">${mark.map((d) => `<path d="${d}"/>`).join('')}</g>`));
}
export const vowIconUri = (id: string, color = '#FFFFFF') => assetFor('prayer-vow-' + id.replace(/_/g, '-')) || uri(lineSvg(VOW_PATHS[id] || GENERIC_MARK, color));
export const witnessedUri = (color = '#FFFFFF') => assetFor('prayer-witnessed') || uri(lineSvg(WITNESSED_PATHS, color));

// ---------- the portrait's face (Faith 2.2, spec 2.2, 2.5, 2.6) ----------
/** Where each patron's face (or mask) sits in its 4:5 portrait (art/portraits/patrons, 800 × 1000), picked by eye from
 *  the eight paintings: x and y are the face's centre as fractions of the width and the height, s the square's side as a
 *  fraction of the width. The Hymn's square crop over the head, the round crops on the voice-line cards and the log
 *  cards' small portraits all cut from here. A patron not listed (a new painting) takes the top centre. */
export const PORTRAIT_FACE: Record<string, { x: number; y: number; s: number }> = {
  nerukhan: { x: 0.53, y: 0.17, s: 0.36 }, // the upturned face inside the saints' halos
  the_quartermaster: { x: 0.48, y: 0.17, s: 0.36 }, // the face under the brim of the cap
  the_laughing_mask: { x: 0.32, y: 0.19, s: 0.36 }, // the mask and its tear
  the_toll_keeper: { x: 0.67, y: 0.18, s: 0.36 }, // the hooded face beside the lantern
  mother_ember: { x: 0.56, y: 0.19, s: 0.36 }, // the smiling face in the ring of fire
  old_overcast: { x: 0.53, y: 0.22, s: 0.4 }, // the face in the storm cloud (a wider cut: it is the cloud)
  the_matchmaker: { x: 0.53, y: 0.18, s: 0.36 }, // the upturned face under the knot
  the_counting_weaver: { x: 0.56, y: 0.2, s: 0.36 }, // the face with the spectacles
};
const FACE_DEFAULT = { x: 0.5, y: 0.2, s: 0.4 };
/** A patron's face box (either spelling of the two with an article). */
export const faceOf = (patron: string | null | undefined) => { const id = String(patron || ''); return PORTRAIT_FACE[id] || PORTRAIT_FACE['the_' + id] || PORTRAIT_FACE[id.replace(/^the_/, '')] || FACE_DEFAULT; };
/** The CSS that places a 4:5 portrait <img> inside a square box (position: relative; overflow: hidden) so the box shows
 *  the face: the image is 1/s of the box wide, shifted so the face's centre sits in the box's centre. */
export function faceImgStyle(patron: string | null | undefined): string {
  const f = faceOf(patron), w = 100 / f.s, left = (0.5 - f.x / f.s) * 100, top = (0.5 - (1.25 * f.y) / f.s) * 100;
  const r = (n: number) => Math.round(n * 100) / 100;
  return 'position: absolute; display: block; max-width: none; width: ' + r(w) + '%; height: auto; left: ' + r(left) + '%; top: ' + r(top) + '%';
}
/** A face crop: the portrait and the style that frames its face; the mark (whole, centred) when there is no painting. */
export function patronFace(patron: string | null | undefined, large = false): { src: string; imgStyle: string; painted: boolean } {
  const id = String(patron || ''), src = id ? patronPortrait(id, large) : null;
  if (src) return { src, imgStyle: faceImgStyle(id), painted: true };
  return { src: patronMarkUri(id), imgStyle: 'position: absolute; display: block; inset: 12%; width: 76%; height: 76%', painted: false };
}
