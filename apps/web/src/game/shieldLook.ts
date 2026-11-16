// 0.30.0, the shield display (Leon, 16 Nov 2026: "the shield display on your token in battle is a tiny bar above your
// hp, this might fool player into thinking all source of shield stacks into that bar"). The engine's shieldsView
// (screenViews.ts) says what a unit holds, in the order a blow meets it, and what the viewer may know; this file only
// draws it:
//   shieldStrip   the token's strip over the HP bar: one segment a shield, in its source's attribute ink, a 1 px dark
//                 gap between them, each as wide as its share of max HP (at least MIN_SEG), capped at the bar with a "+"
//   shieldBlock   the SHIELDS lines of a card (the hover card, the target card, your own panel): a pip, the name, the
//                 amount (a size word for a foe), how long it lasts; Guard on a line of its own; what stands before HP;
//                 the engine's one-line rule
// Every word is the engine's or data's (rules.json combat.shield_look); no shield, item or class id is named here.
import { ATTR_INK } from './classView';

/** A shield with no one attribute (the base shield: many givers) draws in the text ink. */
export const NEUTRAL_INK = '#E7EBF3';
/** The least share of the strip a shield takes, so a small one still shows (percent of the HP bar's width). */
export const MIN_SEG = 10;
/** Glyphs that pair with the colour: a layer, the base shield. */
export const GLYPH = { layer: '◆', base: '■' } as const;

export interface ShieldEntryV { key: string; kind: 'layer' | 'base'; name: string; attribute: string | null; by: string | null; amount: number | null; size: string | null; bar: number; lasts: string; combines: string; how: string; order: number }
export interface ShieldsViewV { known: boolean; maxHp: number; entries: ShieldEntryV[]; guard: { name: string; plates: number; max: number; soak: number; how: string } | null; blow: number | null; all: number | null; allWord: string; rule: string }

export const inkOf = (e: Pick<ShieldEntryV, 'attribute'>): string => (e.attribute && ATTR_INK[e.attribute]) || NEUTRAL_INK;
const num = (n: number) => Math.round(n).toLocaleString('en-US');

/** The token's strip. `solid`: a shield that a blow meets (every entry the engine lists: none of them is set aside). */
export function shieldStrip(sv: ShieldsViewV | null) {
  const es = sv ? sv.entries : [];
  let used = 0, over = false;
  const segs = es.map((e, i) => {
    const want = Math.max(MIN_SEG, Math.min(100, e.bar * 100)), w = Math.max(0, Math.min(want, 100 - used));
    if (want > w) over = true; used += w;
    return { key: e.key, kind: e.kind, name: e.name, ink: inkOf(e), width: w,
      // the strip's 1 px gap (its dark ground) parts each shield from the next
      style: 'flex: 0 0 calc(' + w.toFixed(2) + '% - ' + (i ? 1 : 0) + 'px); height: 100%; background: ' + inkOf(e) };
  }).filter((s) => s.width > 0);
  return { has: segs.length > 0, segs, over,
    boxStyle: 'position: absolute; left: 5px; right: 5px; bottom: 6px; height: 3px; z-index: 3; display: flex; gap: 1px; border-radius: 2px; overflow: hidden; pointer-events: none; background: rgba(5, 7, 11, 0.85)',
    plusStyle: 'position: absolute; right: 1px; bottom: 8px; z-index: 4; font-size: 9px; font-weight: 700; line-height: 1; color: #FFFFFF; text-shadow: 0 0 2px #05070B, 0 0 2px #05070B; pointer-events: none',
    title: es.map((e) => e.name + ' ' + (e.amount != null ? num(e.amount) : e.size)).join(' · ') };
}

/** The SHIELDS block of a card. */
export function shieldBlock(sv: ShieldsViewV | null) {
  const es = sv ? sv.entries : [], g = sv ? sv.guard : null;
  const lines = es.map((e) => ({ key: e.key, kind: e.kind, glyph: GLYPH[e.kind], name: e.name, ink: inkOf(e),
    amount: e.amount != null ? num(e.amount) : (e.size || '').toUpperCase(),
    lasts: e.lasts + (e.by ? ' · from ' + e.by : ''),
    pipStyle: 'flex: none; width: 10px; text-align: center; font-size: 11px; color: ' + inkOf(e),
    nameStyle: 'font-weight: 700; color: ' + inkOf(e),
    text: GLYPH[e.kind] + ' ' + e.name + ' ' + (e.amount != null ? num(e.amount) : (e.size || '')) + ' · ' + e.lasts + (e.by ? ' · from ' + e.by : '') }));
  const guardLine = g ? g.name + ' ' + g.plates + (g.plates === 1 ? ' plate' : ' plates') + ', each soaks ' + num(g.soak) : '';
  const absorb = !sv || (!es.length && !g) ? '' : sv.all != null ? 'Absorbs up to ' + num(sv.all) + ' before HP' : 'Absorbs ' + sv.allWord + ' before HP';
  return { has: es.length > 0 || !!g, lines, hasGuard: !!g, guardLine, guardTitle: g ? g.how : '', absorb, rule: sv ? sv.rule : '',
    headStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #A3AEC2',
    lineStyle: 'display: flex; gap: 5px; align-items: baseline; font-size: 13px; color: #E7EBF3; line-height: 1.3',
    subStyle: 'font-size: 12px; color: #A3AEC2; line-height: 1.3',
    /** the block as one line of words (an aria-label, a tile's label) */
    words: [...lines.map((l) => l.text), guardLine, absorb].filter(Boolean).join(' · ') };
}
