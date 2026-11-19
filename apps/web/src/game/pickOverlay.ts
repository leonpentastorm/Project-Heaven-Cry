// Rules 1.65 (the picking contract, C1): the ONE overlay every aimed action uses on the fight's grid. It draws the
// engine's own marks (descriptors.ts previewDescriptor: GridMarks), by kind, for every system alike:
//
//   reach    every tile the action could be aimed at from here       shaded, a dashed edge, on select
//   choice   the tiles the open pick takes (units: tone 'choice')    outlined in the action's ink, a ◇ on a unit
//   area     what the aim covers (the hovered aim, else the picked)  filled in the ink
//   target   the units it would touch, with the engine's word        ringed, a badge with the word (or ENEMY / ALLY)
//
// Nothing here works out a rule: a tile is marked only because the engine's preview named it. Colour is the action's
// own ink (a door's attribute, the patron's Virtue ink, a Sigil's cyan), always with a word or a glyph beside it (the
// badges, and each tile's note in the hover card).
import type { SgTile } from './sigilView';

/** The marks of one preview, as actionFlow keeps them. */
export interface PickMarks { reach: Iterable<string>; choice: Set<string>; choiceUnits: Set<string>; area: string[]; targets: { id: string; tag: string; tone: string }[] }

/** A colour with an alpha, from #RRGGBB. */
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')'; };
const BADGE = 'position: absolute; z-index: 4; padding: 0 4px; border-radius: 4px; font-size: var(--fs-sub); font-weight: 700; line-height: 14px; letter-spacing: 0.04em; white-space: nowrap; pointer-events: none; ';
const HOSTILE = '#F65157', ALLY = '#7FD4FF';

/** The overlay's tiles: reach, choices, the area and whom it touches. ink: the action's own colour. */
export function pickTiles(cb: any, m: PickMarks | null | undefined, side: 'pc' | 'foe', ink = '#E7EBF3'): Record<string, SgTile> {
  const out: Record<string, SgTile> = {}; if (!m) return out;
  const T = (k: string) => (out[k] ||= { layer: '', marks: [], note: '' });
  const note = (t: SgTile, w: string) => { t.note += (t.note ? ' · ' : '') + w; };
  const inReach = new Set(m.reach);
  for (const k of inReach) { if (m.choice.has(k)) continue; const t = T(k); t.layer = 'background: ' + rgba(ink, 0.06) + '; outline: 1px dashed ' + rgba(ink, 0.55) + '; outline-offset: -2px'; }
  // a choice is drawn over its reach: its card says both (rules 1.65: reach, then the open pick's choices inside it)
  for (const k of m.choice) { const t = T(k); t.layer = 'background: ' + rgba(ink, 0.12) + '; outline: 2px solid ' + rgba(ink, 0.85) + '; outline-offset: -2px'; note(t, 'click to aim'); }
  for (const k of m.area) { const t = T(k); t.layer = 'background: ' + rgba(ink, 0.3) + '; outline: 2px solid ' + ink + '; outline-offset: -2px'; }
  const at = (id: string) => (cb.units || []).find((y: any) => y.id === id && !y.dead) || (cb.units || []).find((y: any) => y.id === id);
  for (const id of m.choiceUnits) {
    const x = at(id); if (!x) continue; const t = T(x.pos);
    t.marks.push({ key: 'pkpick', text: '◇', style: BADGE + 'background: #0A0D13; color: ' + ink + '; border: 1px solid ' + ink + '; right: -2px; top: -2px', title: x.name + ': you can pick them' });
    t.layer = (t.layer ? t.layer + '; ' : '') + 'outline: 2px solid ' + ink + '; outline-offset: -2px'; note(t, x.name + ': you can pick them');
  }
  for (const g of m.targets) {
    const x = at(g.id); if (!x) continue;
    const ally = x.side === side, mk = g.tone === 'help' || (g.tone !== 'harm' && ally) ? ALLY : HOSTILE, t = T(x.pos), word = g.tag || (ally ? 'ALLY' : 'ENEMY');
    t.marks.push({ key: 'pkwho', text: word, style: BADGE + 'background: ' + mk + '; color: #0A0D13; left: 50%; top: -1px; transform: translateX(-50%)', title: x.name + ': ' + word });
    t.layer = (t.layer ? t.layer + '; ' : '') + 'box-shadow: inset 0 0 0 2px ' + mk; note(t, x.name + ': ' + word);
  }
  return out;
}
